# backend/prepare_knowledge_base.py
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.document_loaders import DirectoryLoader # Will need to be adjusted for .md
from langchain.vectorstores import FAISS
from langchain.embeddings import HuggingFaceEmbeddings
import os

print("Starting knowledge base creation...")

# Define the base directory for your knowledge files
knowledge_base_dir = 'backend/knowledge_base/'

# Ensure the directory exists (important if you're running this from a fresh project)
if not os.path.exists(knowledge_base_dir):
    print(f"Error: Knowledge base directory '{knowledge_base_dir}' not found.")
    print("Please ensure your philosophical text files are placed inside it.")
    exit()

# Load documents from the knowledge_base directory and its subdirectories
# --- IMPROVEMENT: Load Markdown files ---
# You'll need a Markdown-specific loader or ensure DirectoryLoader can handle it.
# For simplicity, if they are still parsed as plain text, using "**/*.md" is sufficient.
# If you want to parse Markdown to extract structured data (e.g., metadata), you'd need a more advanced loader.
# For now, let's assume DirectoryLoader with glob is fine for text extraction from .md files.
loader = DirectoryLoader(knowledge_base_dir, glob="**/*.md", show_progress=True) # Changed to .md
documents = loader.load()

if not documents:
    print(f"No Markdown files found in '{knowledge_base_dir}'. Please add some content.")
    exit()

print(f"Loaded {len(documents)} documents.")

# Chunk the documents
# Adjust chunk_size and chunk_overlap as needed.
# For philosophical texts, you might want larger chunks to keep arguments coherent.
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=200) # Slightly larger chunks
docs = text_splitter.split_documents(documents)

print(f"Split into {len(docs)} chunks.")

# Create embeddings and store in FAISS
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
db = FAISS.from_documents(docs, embeddings)

# Save the local vector database
faiss_index_path = "backend/faiss_index"
db.save_local(faiss_index_path)
print(f"Knowledge base created and saved to '{faiss_index_path}'.")
