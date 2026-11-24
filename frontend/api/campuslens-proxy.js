// Server-side only: never expose backend credentials to the browser.
export default async function handler(req, res) {
  const path = typeof req.query.path === 'string' ? req.query.path : '';
  if (!/^(health|events|agents\/skills|recognize|chat|buildings(?:\/\d+(?:\/(?:events|departments|classes))?)?)$/.test(path)) {
    return res.status(404).json({detail: 'Unknown CampusLens API route.'});
  }
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({detail: 'Method not allowed.'});
  }
  try {
    const base = process.env.BACKEND_API_URL?.trim() || (process.env.VERCEL_ENV === 'production' ? 'https://mtu-campuslens-backend.vercel.app' : 'https://mtu-campuslens-backend-git-campusle-f3f647-sabinalucys-projects.vercel.app');
    const target = new URL('/api/' + path, base);
    if (target.protocol !== 'https:') throw new Error('HTTPS backend required');
    const headers = {};
    if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];
    if (process.env.BACKEND_PROTECTION_BYPASS) headers['x-vercel-protection-bypass'] = process.env.BACKEND_PROTECTION_BYPASS;
    let body;
    if (req.method === 'POST') {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > 9 * 1024 * 1024) return res.status(413).json({detail: 'Upload too large.'});
        chunks.push(buffer);
      }
      body = Buffer.concat(chunks);
    }
    const upstream = await fetch(target, {method: req.method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(55000)});
    const type = upstream.headers.get('content-type') || '';
    if (!type.includes('application/json')) return res.status(502).json({detail: 'Backend returned a non-JSON response. Check backend deployment protection and URL.'});
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.error('CampusLens proxy:', error.message);
    return res.status(502).json({detail: 'CampusLens backend is temporarily unreachable.'});
  }
}
