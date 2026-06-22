module.exports = (app) => {
  app.context.onerror = function(err) {
    if (err == null) return;

    const isNativeError =
      Object.prototype.toString.call(err) === '[object Error]' ||
      err instanceof Error;
    if (!isNativeError) err = new Error(`non-error thrown: ${err}`);

    if (this.headerSent || !this.writable) {
      err.headerSent = true;
      this.app.emit('error', err, this);
      return;
    }

    this.app.emit('error', err, this);
  };

  app.on('error', (err, ctx) => {
    if (err.headerSent) return;

    const status = err.statusCode || err.status || 500;
    const message = err.message || 'Internal Server Error';
    const body = JSON.stringify({ error: message });

    ctx.status = status;
    ctx.type = 'application/json';
    ctx.length = Buffer.byteLength(body);
    ctx.res.end(body);

    console.error(`[ERROR] ${ctx.method} ${ctx.url} - ${status} - ${message}`);
  });
};
