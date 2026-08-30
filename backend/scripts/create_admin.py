import sys

from db.database import SessionLocal, Base, engine
from models.user import User
from core.security import hash_password


def main():
    if len(sys.argv) != 4:
        print("Usage: uv run -m scripts.create_admin <name> <email> <password>")
        sys.exit(1)

    name, email, password = sys.argv[1], sys.argv[2], sys.argv[3]

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            existing.role = "admin"
            db.commit()
            print(f"'{email}' already existed — promoted to admin.")
            return

        user = User(
            name=name,
            email=email,
            hashed_password=hash_password(password),
            role="admin",
        )
        db.add(user)
        db.commit()
        print(f"Admin created: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
