import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
  const { path } = req.query;
  const fullPath = join(process.cwd(), path);

  if (!path || !path.endsWith('.json')) {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  try {
    const fileContent = readFileSync(fullPath, 'utf8');
    const jsonData = JSON.parse(fileContent);
    res.status(200).json(jsonData);
  } catch (error) {
    res.status(404).json({ error: 'File not found or failed to parse JSON.' });
  }
}
