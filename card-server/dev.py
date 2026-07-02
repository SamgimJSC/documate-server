"""FastAPI(API 서버)와 카드 추천 워커를 한 번에 띄우는 개발용 러너.

    python dev.py

Ctrl+C 하면 두 프로세스를 함께 종료한다.
한 프로세스가 죽으면 나머지도 정리하고 종료한다.
(크롤링 배치는 별도: python crawl.py)
"""
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))


def _resolve_python() -> str:
    """전역 파이썬으로 dev.py 를 띄워도 자식은 프로젝트 venv 파이썬을 쓰도록 한다."""
    candidates = [
        os.path.join(HERE, "venv", "Scripts", "python.exe"),  # Windows
        os.path.join(HERE, "venv", "bin", "python"),  # macOS/Linux
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return sys.executable


PYTHON = _resolve_python()

COMMANDS = [
    ("api", [PYTHON, "main.py"]),
    ("worker", [PYTHON, "-m", "app.worker"]),
]


def main() -> None:
    procs = []
    for name, cmd in COMMANDS:
        print(f"[dev] starting {name}: {' '.join(cmd)}")
        procs.append((name, subprocess.Popen(cmd)))

    exit_code = 0
    try:
        while True:
            for name, p in procs:
                code = p.poll()
                if code is not None:
                    print(f"[dev] {name} exited (code={code}), shutting down rest.")
                    exit_code = code or 0
                    raise SystemExit
            time.sleep(1)
    except (KeyboardInterrupt, SystemExit):
        pass
    finally:
        for name, p in procs:
            if p.poll() is None:
                print(f"[dev] stopping {name}...")
                p.terminate()
        for _, p in procs:
            p.wait()

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
