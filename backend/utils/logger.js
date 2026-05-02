const isProd = process.env.NODE_ENV === 'production';

function emit(level, msg, meta = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...meta,
  };
  const line = isProd ? JSON.stringify(payload) : `[Learn2Hire ${level}] ${msg}${Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

module.exports = {
  info: (msg, meta) => emit('info', msg, meta || {}),
  warn: (msg, meta) => emit('warn', msg, meta || {}),
  error: (msg, meta) => emit('error', msg, meta || {}),
};
