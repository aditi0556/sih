from datetime import date, datetime, timedelta, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from db.database import get_db
from models.driver import Driver
from models.dustbin import Dustbin
from models.hotspot import Hotspot
from models.survey import SurveyAssignment, SurveyItem, SurveyLog
from schemas.survey import (
    DustbinSurveyItemOut,
    HotspotSurveyItemOut,
    SurveyAssignmentOut,
    SurveyScheduleStats,
    SurveyScheduleResponse,
    UpdateDustbinFillRequest,
    UpdateHotspotPresenceRequest,
    BatchSurveyUpdateRequest,
    CreateSurveyAssignmentRequest,
    SurveyDriverOut,
)

router = APIRouter(prefix="/survey", tags=["survey"])


def get_week_monday(d: date) -> date:
    """Returns the Monday of the given date's week."""
    return d - timedelta(days=d.weekday())


def auto_generate_weekly_schedule(db: Session, week_monday: date) -> List[SurveyAssignment]:
    """Generates weekly survey assignments distributing dustbins and hotspots across available drivers."""
    drivers = db.query(Driver).all()
    if not drivers:
        # Fallback dummy driver if none exists
        default_driver = Driver(driver_id=1, name="Primary Survey Team", phone="9999999999", status="AVAILABLE")
        db.add(default_driver)
        db.commit()
        drivers = [default_driver]

    dustbins = db.query(Dustbin).order_by(Dustbin.dustbin_id).all()
    hotspots = db.query(Hotspot).order_by(Hotspot.id).all()

    # If no hotspots exist in DB yet, create sample ones for Mangaluru
    if not hotspots:
        sample_hotspots = [
            Hotspot(id=1, latitude=12.8715, longitude=74.8425, times_found_dirty=4),
            Hotspot(id=2, latitude=12.8830, longitude=74.8560, times_found_dirty=8),
            Hotspot(id=3, latitude=12.8490, longitude=74.9012, times_found_dirty=2),
            Hotspot(id=4, latitude=12.9570, longitude=74.8080, times_found_dirty=6),
        ]
        db.add_all(sample_hotspots)
        db.commit()
        hotspots = db.query(Hotspot).order_by(Hotspot.id).all()

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    assignments = []
    num_drivers = len(drivers)

    for i, driver in enumerate(drivers):
        day_assigned = days[i % len(days)]
        assignment = SurveyAssignment(
            driver_id=driver.driver_id,
            assigned_to_name=driver.name,
            week_start_date=week_monday,
            day_of_week=day_assigned,
            status="IN_PROGRESS",
            notes=f"Weekly field survey for {driver.name} ({day_assigned})"
        )
        db.add(assignment)
        db.flush()

        # Distribute dustbins
        assigned_dustbins = [b for idx, b in enumerate(dustbins) if idx % num_drivers == i]
        for b in assigned_dustbins:
            item = SurveyItem(
                assignment_id=assignment.id,
                item_type="DUSTBIN",
                dustbin_id=b.dustbin_id,
                status="PENDING",
                recorded_fill_level=None
            )
            db.add(item)

        # Distribute hotspots
        assigned_hotspots = [h for idx, h in enumerate(hotspots) if idx % num_drivers == i]
        for h in assigned_hotspots:
            item = SurveyItem(
                assignment_id=assignment.id,
                item_type="HOTSPOT",
                hotspot_id=h.id,
                status="PENDING",
                is_hotspot_present=None
            )
            db.add(item)

        assignments.append(assignment)

    db.commit()
    return assignments


@router.get("/schedule", response_model=SurveyScheduleResponse)
def get_survey_schedule(
    week_date: Optional[date] = Query(default=None, description="Any date within the target week"),
    driver_id: Optional[int] = Query(default=None, description="Filter assignments by Driver ID"),
    db: Session = Depends(get_db)
):
    target_date = week_date or date.today()
    week_monday = get_week_monday(target_date)

    # Check if assignments exist for this week
    assignments_query = db.query(SurveyAssignment).filter(SurveyAssignment.week_start_date == week_monday)
    if driver_id is not None:
        assignments = assignments_query.filter(SurveyAssignment.driver_id == driver_id).all()
    else:
        assignments = assignments_query.all()

    # If no assignments exist at all for this week, generate them
    if not assignments and driver_id is None:
        assignments = auto_generate_weekly_schedule(db, week_monday)
    elif not assignments and driver_id is not None:
        # Check if week has assignments in general
        all_week_assignments = db.query(SurveyAssignment).filter(SurveyAssignment.week_start_date == week_monday).all()
        if not all_week_assignments:
            auto_generate_weekly_schedule(db, week_monday)
            assignments = db.query(SurveyAssignment).filter(
                SurveyAssignment.week_start_date == week_monday,
                SurveyAssignment.driver_id == driver_id
            ).all()

    # Build response with detailed items
    all_dustbins_map = {b.dustbin_id: b for b in db.query(Dustbin).all()}
    all_hotspots_map = {h.id: h for h in db.query(Hotspot).all()}

    assignment_outs: List[SurveyAssignmentOut] = []
    tot_dustbins = 0
    comp_dustbins = 0
    tot_hotspots = 0
    comp_hotspots = 0

    all_dustbin_items: List[DustbinSurveyItemOut] = []
    all_hotspot_items: List[HotspotSurveyItemOut] = []

    for a in assignments:
        bins_out: List[DustbinSurveyItemOut] = []
        hotspots_out: List[HotspotSurveyItemOut] = []

        for it in a.items:
            if it.item_type == "DUSTBIN" and it.dustbin_id in all_dustbins_map:
                b = all_dustbins_map[it.dustbin_id]
                bin_item = DustbinSurveyItemOut(
                    id=it.id,
                    dustbin_id=b.dustbin_id,
                    latitude=b.latitude,
                    longitude=b.longitude,
                    zone_type=b.zone_type,
                    population=b.population,
                    previous_fill=b.previous_day_fill,
                    status=it.status,
                    recorded_fill_level=it.recorded_fill_level if it.recorded_fill_level is not None else b.previous_day_fill,
                    inspected_at=it.inspected_at,
                    remarks=it.remarks
                )
                bins_out.append(bin_item)
                all_dustbin_items.append(bin_item)
                tot_dustbins += 1
                if it.status == "COMPLETED":
                    comp_dustbins += 1

            elif it.item_type == "HOTSPOT" and it.hotspot_id in all_hotspots_map:
                h = all_hotspots_map[it.hotspot_id]
                hotspot_item = HotspotSurveyItemOut(
                    id=it.id,
                    hotspot_id=h.id,
                    latitude=h.latitude,
                    longitude=h.longitude,
                    times_found_dirty=h.times_found_dirty,
                    status=it.status,
                    is_hotspot_present=it.is_hotspot_present,
                    inspected_at=it.inspected_at,
                    remarks=it.remarks
                )
                hotspots_out.append(hotspot_item)
                all_hotspot_items.append(hotspot_item)
                tot_hotspots += 1
                if it.status == "COMPLETED":
                    comp_hotspots += 1

        a_out = SurveyAssignmentOut(
            id=a.id,
            driver_id=a.driver_id,
            assigned_to_name=a.assigned_to_name,
            week_start_date=a.week_start_date,
            day_of_week=a.day_of_week,
            status=a.status,
            notes=a.notes,
            created_at=a.created_at,
            total_dustbins=len(bins_out),
            completed_dustbins=sum(1 for x in bins_out if x.status == "COMPLETED"),
            total_hotspots=len(hotspots_out),
            completed_hotspots=sum(1 for x in hotspots_out if x.status == "COMPLETED"),
            dustbins=bins_out,
            hotspots=hotspots_out
        )
        assignment_outs.append(a_out)

    # ── Auto-sync any newly reported hotspots into survey assignments ──────────
    assigned_hotspot_ids = {item.hotspot_id for item in all_hotspot_items}
    for h_id, h in all_hotspots_map.items():
        if h_id not in assigned_hotspot_ids:
            new_item_id = None
            if assignments:
                new_item = SurveyItem(
                    assignment_id=assignments[0].id,
                    item_type="HOTSPOT",
                    hotspot_id=h.id,
                    status="PENDING",
                    is_hotspot_present=None
                )
                db.add(new_item)
                db.commit()
                db.refresh(new_item)
                new_item_id = new_item.id

            hotspot_item = HotspotSurveyItemOut(
                id=new_item_id or h.id,
                hotspot_id=h.id,
                latitude=h.latitude,
                longitude=h.longitude,
                times_found_dirty=h.times_found_dirty,
                status="PENDING",
                is_hotspot_present=None,
                inspected_at=None,
                remarks="Driver reported hotspot"
            )
            all_hotspot_items.append(hotspot_item)
            tot_hotspots += 1
            if assignment_outs:
                assignment_outs[0].hotspots.append(hotspot_item)
                assignment_outs[0].total_hotspots += 1

    total_tasks = tot_dustbins + tot_hotspots
    completed_tasks = comp_dustbins + comp_hotspots

    completion_pct = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0

    stats = SurveyScheduleStats(
        total_assignments=len(assignment_outs),
        total_dustbins=tot_dustbins,
        completed_dustbins=comp_dustbins,
        pending_dustbins=tot_dustbins - comp_dustbins,
        total_hotspots=tot_hotspots,
        completed_hotspots=comp_hotspots,
        pending_hotspots=tot_hotspots - comp_hotspots,
        overall_completion_pct=completion_pct
    )

    return SurveyScheduleResponse(
        week_start_date=str(week_monday),
        stats=stats,
        assignments=assignment_outs,
        all_dustbins=all_dustbin_items,
        all_hotspots=all_hotspot_items
    )


@router.get("/drivers", response_model=List[SurveyDriverOut])
def get_survey_drivers(db: Session = Depends(get_db)):
    """Returns list of all drivers for assignment and survey filtering."""
    return db.query(Driver).order_by(Driver.driver_id).all()


@router.post("/update-dustbin-fill")
def update_dustbin_fill(
    payload: UpdateDustbinFillRequest,
    db: Session = Depends(get_db)
):
    """Updates a dustbin's measured fill level from ground survey and records survey item completion."""
    dustbin = db.query(Dustbin).filter(Dustbin.dustbin_id == payload.dustbin_id).first()
    if not dustbin:
        raise HTTPException(status_code=404, detail=f"Dustbin {payload.dustbin_id} not found")

    # Update dustbin fill level
    old_fill = dustbin.previous_day_fill
    dustbin.previous_day_fill = float(payload.fill_level)
    if payload.fill_level <= 5.0:
        dustbin.days_since_last_collection = 0

    now = datetime.now(timezone.utc)

    # Update survey item in assignment if assignment_id is provided or find current pending item
    updated_items_count = 0
    if payload.assignment_id:
        items = db.query(SurveyItem).filter(
            SurveyItem.assignment_id == payload.assignment_id,
            SurveyItem.dustbin_id == payload.dustbin_id
        ).all()
    else:
        # Match latest pending item for this dustbin
        items = db.query(SurveyItem).filter(
            SurveyItem.dustbin_id == payload.dustbin_id,
            SurveyItem.status == "PENDING"
        ).all()

    for item in items:
        item.status = "COMPLETED"
        item.recorded_fill_level = float(payload.fill_level)
        item.inspected_at = now
        item.remarks = payload.remarks
        updated_items_count += 1

        # Check if parent assignment is completely done
        parent_assignment = db.query(SurveyAssignment).filter(SurveyAssignment.id == item.assignment_id).first()
        if parent_assignment:
            pending_count = db.query(SurveyItem).filter(
                SurveyItem.assignment_id == parent_assignment.id,
                SurveyItem.status == "PENDING"
            ).count()
            if pending_count == 0:
                parent_assignment.status = "COMPLETED"

    # Create audit log
    survey_log = SurveyLog(
        item_type="DUSTBIN",
        target_id=payload.dustbin_id,
        driver_name=payload.driver_name or "Surveyor",
        recorded_fill_level=float(payload.fill_level),
        is_hotspot_present=None,
        remarks=payload.remarks or f"Fill updated from {old_fill}% to {payload.fill_level}%",
        created_at=now
    )
    db.add(survey_log)
    db.commit()
    db.refresh(dustbin)

    return {
        "status": "success",
        "dustbin_id": dustbin.dustbin_id,
        "new_fill_level": dustbin.previous_day_fill,
        "survey_items_updated": updated_items_count,
        "message": f"Fill level for Dustbin #{dustbin.dustbin_id} successfully recorded as {payload.fill_level}%"
    }


@router.post("/update-hotspot-presence")
def update_hotspot_presence(
    payload: UpdateHotspotPresenceRequest,
    db: Session = Depends(get_db)
):
    """Updates presence of a hotspot (Yes/No) from ground survey and records survey item completion."""
    hotspot = db.query(Hotspot).filter(Hotspot.id == payload.hotspot_id).first()
    if not hotspot:
        raise HTTPException(status_code=404, detail=f"Hotspot {payload.hotspot_id} not found")

    # If dirty/waste is present (Yes), increment times_found_dirty
    if payload.is_present:
        hotspot.times_found_dirty += 1

    now = datetime.now(timezone.utc)

    updated_items_count = 0
    if payload.assignment_id:
        items = db.query(SurveyItem).filter(
            SurveyItem.assignment_id == payload.assignment_id,
            SurveyItem.hotspot_id == payload.hotspot_id
        ).all()
    else:
        items = db.query(SurveyItem).filter(
            SurveyItem.hotspot_id == payload.hotspot_id,
            SurveyItem.status == "PENDING"
        ).all()

    for item in items:
        item.status = "COMPLETED"
        item.is_hotspot_present = payload.is_present
        item.inspected_at = now
        item.remarks = payload.remarks
        updated_items_count += 1

        # Check if parent assignment is completely done
        parent_assignment = db.query(SurveyAssignment).filter(SurveyAssignment.id == item.assignment_id).first()
        if parent_assignment:
            pending_count = db.query(SurveyItem).filter(
                SurveyItem.assignment_id == parent_assignment.id,
                SurveyItem.status == "PENDING"
            ).count()
            if pending_count == 0:
                parent_assignment.status = "COMPLETED"

    # Create audit log
    presence_text = "Waste Present (Dirty)" if payload.is_present else "Clean (No Waste)"
    survey_log = SurveyLog(
        item_type="HOTSPOT",
        target_id=payload.hotspot_id,
        driver_name=payload.driver_name or "Surveyor",
        recorded_fill_level=None,
        is_hotspot_present=payload.is_present,
        remarks=payload.remarks or f"Hotspot verified: {presence_text}",
        created_at=now
    )
    db.add(survey_log)
    db.commit()
    db.refresh(hotspot)

    return {
        "status": "success",
        "hotspot_id": hotspot.id,
        "is_present": payload.is_present,
        "times_found_dirty": hotspot.times_found_dirty,
        "survey_items_updated": updated_items_count,
        "message": f"Hotspot #{hotspot.id} verified as: {presence_text}"
    }


@router.post("/batch-update")
def batch_update_surveys(
    payload: BatchSurveyUpdateRequest,
    db: Session = Depends(get_db)
):
    """Batch updates multiple dustbin fill levels and hotspot verifications in a single request."""
    now = datetime.now(timezone.utc)
    dustbins_updated = 0
    hotspots_updated = 0

    for bin_req in payload.dustbin_updates:
        dustbin = db.query(Dustbin).filter(Dustbin.dustbin_id == bin_req.dustbin_id).first()
        if dustbin:
            dustbin.previous_day_fill = float(bin_req.fill_level)
            if bin_req.fill_level <= 5.0:
                dustbin.days_since_last_collection = 0

            # Update item
            if bin_req.assignment_id:
                items = db.query(SurveyItem).filter(
                    SurveyItem.assignment_id == bin_req.assignment_id,
                    SurveyItem.dustbin_id == bin_req.dustbin_id
                ).all()
            else:
                items = db.query(SurveyItem).filter(
                    SurveyItem.dustbin_id == bin_req.dustbin_id,
                    SurveyItem.status == "PENDING"
                ).all()

            for item in items:
                item.status = "COMPLETED"
                item.recorded_fill_level = float(bin_req.fill_level)
                item.inspected_at = now
                item.remarks = bin_req.remarks

            db.add(SurveyLog(
                item_type="DUSTBIN",
                target_id=bin_req.dustbin_id,
                driver_name=bin_req.driver_name or "Surveyor",
                recorded_fill_level=float(bin_req.fill_level),
                remarks=bin_req.remarks,
                created_at=now
            ))
            dustbins_updated += 1

    for spot_req in payload.hotspot_updates:
        hotspot = db.query(Hotspot).filter(Hotspot.id == spot_req.hotspot_id).first()
        if hotspot:
            if spot_req.is_present:
                hotspot.times_found_dirty += 1

            if spot_req.assignment_id:
                items = db.query(SurveyItem).filter(
                    SurveyItem.assignment_id == spot_req.assignment_id,
                    SurveyItem.hotspot_id == spot_req.hotspot_id
                ).all()
            else:
                items = db.query(SurveyItem).filter(
                    SurveyItem.hotspot_id == spot_req.hotspot_id,
                    SurveyItem.status == "PENDING"
                ).all()

            for item in items:
                item.status = "COMPLETED"
                item.is_hotspot_present = spot_req.is_present
                item.inspected_at = now
                item.remarks = spot_req.remarks

            db.add(SurveyLog(
                item_type="HOTSPOT",
                target_id=spot_req.hotspot_id,
                driver_name=spot_req.driver_name or "Surveyor",
                is_hotspot_present=spot_req.is_present,
                remarks=spot_req.remarks,
                created_at=now
            ))
            hotspots_updated += 1

    db.commit()
    return {
        "status": "success",
        "dustbins_updated": dustbins_updated,
        "hotspots_updated": hotspots_updated
    }


@router.post("/auto-generate")
def trigger_auto_generate(
    week_date: Optional[date] = Query(default=None),
    db: Session = Depends(get_db)
):
    """Manually triggers or regenerates weekly survey schedule assignments."""
    target_date = week_date or date.today()
    week_monday = get_week_monday(target_date)

    # Clear existing assignments for this week if any
    existing = db.query(SurveyAssignment).filter(SurveyAssignment.week_start_date == week_monday).all()
    for a in existing:
        db.delete(a)
    db.commit()

    assignments = auto_generate_weekly_schedule(db, week_monday)
    return {
        "status": "success",
        "week_start_date": str(week_monday),
        "assignments_generated": len(assignments),
        "message": f"Weekly schedule successfully generated for week starting {week_monday}"
    }


@router.get("/logs")
def get_survey_logs(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Returns recent survey audit trail logs."""
    logs = db.query(SurveyLog).order_by(SurveyLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "item_type": l.item_type,
            "target_id": l.target_id,
            "driver_name": l.driver_name,
            "recorded_fill_level": l.recorded_fill_level,
            "is_hotspot_present": l.is_hotspot_present,
            "remarks": l.remarks,
            "created_at": l.created_at.isoformat() if l.created_at else None
        }
        for l in logs
    ]
