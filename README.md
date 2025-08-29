# Logseq RAG Plugin

A Logseq plugin to reindex graph content into DuckDB via a local RAG service and ask questions about your notes.

## Features

- Reindex current page blocks into a RAG service
- Ask questions about your Logseq content
- Configurable service URL
- Fallback gracefully when Logseq API is not available

## Installation

1. Load the plugin in Logseq
2. Configure the service URL (default: http://127.0.0.1:8787)
3. Use the "RAG" button in the toolbar or command palette

## Error Handling

The plugin includes robust error handling:
- Gracefully handles when the Logseq API is not available
- Falls back to UI-only mode if the CDN fails to load
- Proper error messages for network issues
- Try-catch blocks around all async operations

## Troubleshooting

If you see "logseq is not defined" errors:
- Check your internet connection (plugin loads Logseq libs from CDN)
- Wait a moment for the API to load
- Check browser console for detailed error messages
- Plugin will fall back to UI-only mode if needed

## API Endpoints

- `POST /ingest` - Ingest blocks from current page
- `POST /query` - Query the RAG service with a question