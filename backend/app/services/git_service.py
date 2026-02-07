import os
import subprocess
import logging
import shutil
from typing import Optional

logger = logging.getLogger(__name__)

class GitService:
    @staticmethod
    def clone_repo(repo_url: str, target_dir: str) -> bool:
        """Clones a git repository to the target directory."""
        try:
            # Ensure workspace exists
            os.makedirs(os.path.dirname(target_dir), exist_ok=True)
            
            # If directory exists and is not empty, handle it
            if os.path.exists(target_dir):
                if os.listdir(target_dir):
                    logger.warning(f"Target directory {target_dir} is not empty.")
                    # Optional: Shutil remove if needed, but safer to let user know
                    return False
            
            result = subprocess.run(
                ["git", "clone", repo_url, target_dir],
                capture_output=True,
                text=True,
                check=True
            )
            logger.info(f"Successfully cloned {repo_url} to {target_dir}")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Git clone failed: {e.stderr}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error during git clone: {e}")
            return False

    @staticmethod
    def open_in_editor(path: str, editor: str = "vs code") -> bool:
        """Opens the specified path in a code editor."""
        try:
            if editor.lower() in ["vs code", "vscode", "code"]:
                subprocess.run(["code", path], check=True)
            elif editor.lower() == "antigravity":
                # Assuming 'antigravity' is a CLI command or we use 'open' on Mac
                subprocess.run(["open", "-a", "Antigravity", path], check=True)
            else:
                # Default to system open
                subprocess.run(["open", path], check=True)
            return True
        except Exception as e:
            logger.error(f"Failed to open editor: {e}")
            return False
