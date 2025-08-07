import { readdirSync, statSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
  const { path = '.' } = req.query;
  const fullPath = join(process.cwd(), path);

  try {
    const contents = readdirSync(fullPath, { withFileTypes: true });
    
    const folders = contents
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
      
    const files = contents
      .filter(dirent => dirent.isFile())
      .map(dirent => dirent.name);

    res.status(200).json({ folders, files });
  } catch (error) {
    // Return an empty array if the directory doesn't exist or there's an error
    res.status(200).json({ folders: [], files: [], error: `Error reading directory: ${error.message}` });
  }
}
