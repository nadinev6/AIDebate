"""
Document Processing Module
Handles document upload, parsing, chunking, and vectorization
"""

import os
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
import hashlib

logger = logging.getLogger(__name__)

class DocumentProcessor:
    """Process uploaded documents for RAG knowledge base"""

    def __init__(self, upload_dir: str = "backend/uploads"):
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Document processor initialized. Upload dir: {self.upload_dir}")

    def save_file(self, filename: str, content: bytes) -> Dict[str, Any]:
        """
        Save uploaded file to disk

        Args:
            filename: Original filename
            content: File content as bytes

        Returns:
            Dict with file info
        """
        file_hash = hashlib.md5(content).hexdigest()
        safe_filename = self._sanitize_filename(filename)
        file_path = self.upload_dir / f"{file_hash}_{safe_filename}"

        try:
            with open(file_path, 'wb') as f:
                f.write(content)

            logger.info(f"File saved: {file_path}")

            return {
                "id": file_hash,
                "filename": safe_filename,
                "path": str(file_path),
                "size": len(content),
                "success": True
            }
        except Exception as e:
            logger.error(f"Failed to save file: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    def _sanitize_filename(self, filename: str) -> str:
        """Sanitize filename for safe storage"""
        safe_chars = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-")
        return "".join(c if c in safe_chars else "_" for c in filename)

    def parse_document(self, file_path: str) -> Dict[str, Any]:
        """
        Parse document content based on file type

        Args:
            file_path: Path to the document

        Returns:
            Dict with parsed content and metadata
        """
        file_path = Path(file_path)
        extension = file_path.suffix.lower()

        try:
            if extension == '.txt' or extension == '.md':
                return self._parse_text_file(file_path)
            elif extension == '.pdf':
                return self._parse_pdf_file(file_path)
            else:
                return {
                    "success": False,
                    "error": f"Unsupported file type: {extension}"
                }
        except Exception as e:
            logger.error(f"Failed to parse document: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    def _parse_text_file(self, file_path: Path) -> Dict[str, Any]:
        """Parse text or markdown file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            return {
                "success": True,
                "content": content,
                "pages": self._split_into_pages(content),
                "source": file_path.name,
                "type": "text"
            }
        except Exception as e:
            logger.error(f"Failed to parse text file: {str(e)}")
            return {"success": False, "error": str(e)}

    def _parse_pdf_file(self, file_path: Path) -> Dict[str, Any]:
        """Parse PDF file"""
        try:
            try:
                import PyPDF2
            except ImportError:
                return {
                    "success": False,
                    "error": "PyPDF2 not installed. Install with: pip install PyPDF2"
                }

            pages = []
            with open(file_path, 'rb') as f:
                pdf_reader = PyPDF2.PdfReader(f)
                for page_num, page in enumerate(pdf_reader.pages, start=1):
                    text = page.extract_text()
                    if text.strip():
                        pages.append({
                            "page": page_num,
                            "content": text
                        })

            full_content = "\n\n".join(page["content"] for page in pages)

            return {
                "success": True,
                "content": full_content,
                "pages": pages,
                "source": file_path.name,
                "type": "pdf",
                "page_count": len(pages)
            }
        except Exception as e:
            logger.error(f"Failed to parse PDF: {str(e)}")
            return {"success": False, "error": str(e)}

    def _split_into_pages(self, content: str, chars_per_page: int = 2000) -> List[Dict[str, Any]]:
        """Split text content into pseudo-pages"""
        pages = []
        lines = content.split('\n')
        current_page = []
        current_length = 0
        page_num = 1

        for line in lines:
            line_length = len(line)
            if current_length + line_length > chars_per_page and current_page:
                pages.append({
                    "page": page_num,
                    "content": '\n'.join(current_page)
                })
                current_page = [line]
                current_length = line_length
                page_num += 1
            else:
                current_page.append(line)
                current_length += line_length

        if current_page:
            pages.append({
                "page": page_num,
                "content": '\n'.join(current_page)
            })

        return pages

    def chunk_document(
        self,
        content: str,
        pages: List[Dict[str, Any]],
        chunk_size: int = 500,
        chunk_overlap: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Split document into overlapping chunks for vectorization

        Args:
            content: Full document content
            pages: List of page dicts
            chunk_size: Target chunk size in characters
            chunk_overlap: Overlap between chunks

        Returns:
            List of chunk dicts with metadata
        """
        chunks = []
        words = content.split()

        for i in range(0, len(words), chunk_size - chunk_overlap):
            chunk_words = words[i:i + chunk_size]
            chunk_text = ' '.join(chunk_words)

            chunk_page = self._find_page_for_text(chunk_text, pages)

            chunks.append({
                "text": chunk_text,
                "page": chunk_page,
                "chunk_index": len(chunks)
            })

        logger.info(f"Created {len(chunks)} chunks from document")
        return chunks

    def _find_page_for_text(self, text: str, pages: List[Dict[str, Any]]) -> Optional[int]:
        """Find which page a text chunk belongs to"""
        if not pages:
            return None

        text_sample = text[:100]
        for page in pages:
            if text_sample in page["content"]:
                return page["page"]

        return pages[0]["page"]

    def delete_document(self, file_id: str) -> bool:
        """Delete document from disk"""
        try:
            for file_path in self.upload_dir.glob(f"{file_id}_*"):
                file_path.unlink()
                logger.info(f"Deleted document: {file_path}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete document: {str(e)}")
            return False

document_processor = DocumentProcessor()
