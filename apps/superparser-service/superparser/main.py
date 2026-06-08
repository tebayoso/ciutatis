from __future__ import annotations

from superparser.api import create_app

app = create_app()


def main() -> None:
    import uvicorn

    uvicorn.run("superparser.main:app", host="0.0.0.0", port=8080)


if __name__ == "__main__":
    main()
