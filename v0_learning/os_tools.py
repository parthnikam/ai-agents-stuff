import os, sys
import subprocess
from os.path import getsize, join


DIR = r"C:\Users\108pa\Parth\Projects\AGENTS\MCP"


def scan_dir(dir: str):
    for root, dirs, files in os.walk(dir):
        dirs[:] = [d for d in dirs if d not in ('__pycache__', '.venv', '.git')]

        total_size = sum(getsize(join(root, name)) for name in files)
        print(f"\n{root} consumes {total_size} bytes in {len(files)} non-directory files.")
        
        for name in files:
            file_path = join(root, name)
            try:
                file_size = getsize(file_path)
                print(f"\tFile: {name} ({file_size} bytes)")
            except (FileNotFoundError, PermissionError):
                print(f"\tFile: {name} (error reading file size)")
        
        
        
        

def read_file(dir: str):
    with open(dir, "rb") as f:
        data = f.read()
        print(data[:100])
    
def write_file(dir: str, data: str):
    with open(dir, "w", encoding="utf-8") as f:
        f.write(data)


def run_python_script(script_path: str):
    try:
        # sys.executable ensures it uses the exact same Python interpreter environment
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=True,  # Captures stdout and stderr
            text=True,            # Returns output as a string instead of bytes
            check=True            # Raises an error if the script fails (non-zero exit code)
        )
        
        # Access the standard output from the executed file
        return result.stdout

    except subprocess.CalledProcessError as e:
        print(f"The script crashed with exit code {e.returncode}")
        print(f"Error details:\n{e.stderr}")
        return None



# scan_dir(DIR)
# read_file(r"C:\Users\108pa\Parth\Projects\AGENTS\MCP\langraph\main.py")

script_output = run_python_script(r"C:\Users\108pa\Parth\Projects\AGENTS\MCP\langraph\main.py")
if script_output:
    print("Captured Output:\n", script_output)