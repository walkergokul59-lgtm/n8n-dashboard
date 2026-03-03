export default function handler(_req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(501).json({
    error: 'SSE stream is not enabled on this deployment. Use polling endpoints instead.',
  });
}
