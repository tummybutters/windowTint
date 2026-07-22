import squareWebhookHandler from '../lib/square-webhooks-handler.js';

const createNodeResponse = () => {
  const state = {
    body: '',
    headers: new Headers(),
    statusCode: 200
  };

  return {
    state,
    response: {
      setHeader(name, value) {
        state.headers.set(name, String(value));
      },
      status(code) {
        state.statusCode = code;
        return this;
      },
      json(payload) {
        state.headers.set('Content-Type', 'application/json; charset=utf-8');
        state.body = JSON.stringify(payload);
        return this;
      },
      send(payload = '') {
        state.body = typeof payload === 'string' ? payload : JSON.stringify(payload);
        return this;
      },
      end(payload = '') {
        state.body = payload;
        return this;
      }
    }
  };
};

export const createFetchHandler = (options = {}) => {
  const nodeHandler = squareWebhookHandler.createHandler(options);

  return async function fetchHandler(request) {
    const { response, state } = createNodeResponse();
    const nodeRequest = {
      method: request.method,
      headers: Object.fromEntries(request.headers.entries())
    };

    if (request.method === 'POST') {
      const declaredLength = Number(request.headers.get('content-length') || 0);
      if (declaredLength > 256 * 1024) {
        return Response.json({ ok: false, error: 'Invalid Square webhook' }, { status: 413 });
      }
      nodeRequest.body = await request.text();
    }

    await nodeHandler(nodeRequest, response);
    return new Response(state.body || null, {
      status: state.statusCode,
      headers: state.headers
    });
  };
};

export default {
  fetch: createFetchHandler()
};
