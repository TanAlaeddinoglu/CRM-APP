from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.utils import timezone
from django.utils.text import slugify


@dataclass(frozen=True)
class SavedExportFile:
    file_name: str
    relative_path: str
    absolute_path: Path


class FileService:
    def __init__(self, root: Path | None = None):
        self.root = Path(root or settings.EXPORT_FILES_ROOT)

    def save(
        self,
        *,
        model_name: str,
        extension: str,
        content: bytes,
    ) -> SavedExportFile:
        model_dir = self.root / slugify(model_name)
        model_dir.mkdir(parents=True, exist_ok=True)

        timestamp = timezone.now().strftime("%Y%m%d%H%M%S")
        file_name = f"{slugify(model_name)}_{timestamp}_{uuid4().hex[:10]}.{extension}"
        absolute_path = model_dir / file_name
        absolute_path.write_bytes(content)

        return SavedExportFile(
            file_name=file_name,
            relative_path=str(absolute_path.relative_to(self.root.parent)),
            absolute_path=absolute_path,
        )

    def delete(
        self,
        *,
        absolute_path: Path | str | None = None,
        relative_path: str | None = None,
    ) -> bool:
        target_path = self._resolve_target_path(
            absolute_path=absolute_path,
            relative_path=relative_path,
        )

        if not target_path.exists():
            return False

        target_path.unlink()
        self._cleanup_empty_directories(target_path.parent)
        return True

    def _resolve_target_path(
        self,
        *,
        absolute_path: Path | str | None,
        relative_path: str | None,
    ) -> Path:
        if absolute_path is None and relative_path is None:
            raise ValueError("absolute_path or relative_path is required.")

        if absolute_path is not None and relative_path is not None:
            raise ValueError("Use either absolute_path or relative_path, not both.")

        if absolute_path is not None:
            target_path = Path(absolute_path).resolve()
        else:
            target_path = (self.root.parent / str(relative_path)).resolve()

        root_path = self.root.resolve()
        if not target_path.is_relative_to(root_path):
            raise ValueError("Target file must be inside the export directory.")

        return target_path

    def _cleanup_empty_directories(self, directory: Path) -> None:
        root_path = self.root.resolve()
        current = directory.resolve()

        while current != root_path:
            try:
                current.rmdir()
            except OSError:
                break
            current = current.parent
