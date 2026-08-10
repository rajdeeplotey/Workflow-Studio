import os
import zipfile

def package_submission(first_name="Your", last_name="Name"):
    root_dir = os.path.dirname(os.path.abspath(__file__))
    output_filename = f"{first_name}_{last_name}_technical_assessment.zip"
    output_path = os.path.join(root_dir, output_filename)

    exclude_dirs = {
        'node_modules',
        'build',
        '.git',
        '__pycache__',
        '.venv',
        'env',
        'venv',
        '.idea',
        '.vscode'
    }

    exclude_extensions = {'.pyc', '.pyo', '.zip'}

    print(f"Creating submission zip: {output_filename}...")

    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(root_dir):
            # Exclude specified directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]

            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in exclude_extensions or file == output_filename:
                    continue

                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, root_dir)

                # Skip root zip or temporary scripts if needed
                zipf.write(full_path, rel_path)

    print(f"Zip created successfully at: {output_path}")

if __name__ == '__main__':
    package_submission()
