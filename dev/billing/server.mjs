// A stand-in for WHMCS and Paymenter on the development panel: the parts of their APIs the Billing
// block reads. Service 7 of each has an unpaid invoice; Paymenter's service 8 is the demo's.
//
//   node dev/billing/server.mjs        # listens on http://localhost:8460
//
// WHMCS: URL http://localhost:8460/whmcs, API identifier "dev", API secret "dev".
// Paymenter: URL http://localhost:8460/paymenter, API key "dev" (or "services", which may only view services).
// Give a server the external ID 7 or 8 to see a service.
import { createServer } from 'node:http';

const port = Number(process.env.PORT ?? 8460);
const due = (days) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

const whmcs = {
    GetCurrencies: () => ({ currencies: { currency: [{ id: 1, code: 'USD', prefix: '$', suffix: ' USD' }] } }),
    GetClientsProducts: ({ serviceid }) =>
        serviceid === '7'
            ? {
                  products: {
                      product: [
                          {
                              id: 7,
                              clientid: 3,
                              name: 'Diamond Plan',
                              groupname: 'Minecraft',
                              status: 'Active',
                              recurringamount: '14.99',
                              billingcycle: 'Monthly',
                              nextduedate: due(5),
                          },
                      ],
                  },
              }
            : { totalresults: 0, products: '' },
    // As WHMCS documents it: the currency by ID and code; its prefix and suffix are in GetCurrencies.
    GetClientsDetails: () => ({ client: { id: 3, currency: 1, currency_code: 'USD' } }),
    GetInvoices: () => ({ invoices: { invoice: [{ id: 1042, duedate: due(5), total: '14.99', status: 'Unpaid' }, { id: 1043, duedate: due(9), total: '4.00', status: 'Unpaid' }] } }),
    GetInvoice: ({ invoiceid }) => ({
        id: Number(invoiceid),
        items: { item: [invoiceid === '1042' ? { type: 'Hosting', relid: 7 } : { type: 'Addon', relid: 2 }] },
    }),
};

// Paymenter's admin API as its source has it: JSON:API documents, and includes the key may not view
// refused with HTTP 400. Key "dev" may view everything; key "services" may only view services.
const PERMISSIONS = { dev: ['services', 'products', 'invoices'], services: ['services'] };
const INCLUDES = { product: 'products', invoices: 'invoices', user: 'users', order: 'orders', coupon: 'coupons', properties: 'properties' };

const product = { id: '2', type: 'products', attributes: { id: 2, name: 'Diamond Plan', slug: 'diamond' } };
const invoice = (id, status, days) => ({ id: String(id), type: 'invoices', attributes: { id, status, currency_code: 'EUR', due_at: `${due(days)}T00:00:00.000000Z` } });

// Service 7 is overdue with an unpaid invoice; service 8 is the demo's, paid up and due in 5 days.
const services = {
    7: { price: '14.99', currency_code: 'EUR', expires_at: due(-2), invoices: [invoice(80, 'paid', -32), invoice(88, 'pending', -2)] },
    8: { price: '14.99', currency_code: 'USD', expires_at: due(5), invoices: [invoice(81, 'paid', -25)] },
};

/** The includes asked for, or the error Paymenter's query builder gives for one the key may not view. */
const includes = (url, allowed) => {
    const asked = (url.searchParams.get('include') ?? '').split(',').filter(Boolean);
    const permitted = Object.entries(INCLUDES).filter(([, permission]) => allowed.includes(permission)).map(([name]) => name);
    const refused = asked.filter((name) => !permitted.includes(name));
    return refused.length ? { error: `Requested include(s) \`${refused.join(', ')}\` are not allowed. Allowed include(s) are \`${permitted.join(', ')}\`.` } : { asked };
};

/** A service as Paymenter's resources write it, with what was asked included. */
const serviceDocument = (id, asked) => {
    const service = services[id];
    const relationships = {
        ...(asked.includes('product') ? { product: { data: { type: 'products', id: product.id } } } : {}),
        ...(asked.includes('invoices') ? { invoices: { data: service.invoices.map(({ type, id }) => ({ type, id })) } } : {}),
    };
    const attributes = { id: Number(id), quantity: 1, price: service.price, status: 'active', currency_code: service.currency_code, expires_at: `${service.expires_at}T00:00:00.000000Z`, label: null };
    return {
        data: { id: String(id), type: 'services', attributes, relationships },
        included: [...(asked.includes('product') ? [product] : []), ...(asked.includes('invoices') ? service.invoices : [])],
    };
};

const json = (response, status, body) => {
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(body));
};

createServer((request, response) => {
    const url = new URL(request.url ?? '/', `http://localhost:${port}`);

    if (request.method === 'POST' && url.pathname === '/whmcs/includes/api.php') {
        let body = '';
        request.on('data', (chunk) => (body += chunk));
        request.on('end', () => {
            const params = Object.fromEntries(new URLSearchParams(body));
            if (params.identifier !== 'dev' || params.secret !== 'dev') return json(response, 403, { result: 'error', message: 'Authentication Failed' });
            const action = whmcs[params.action];
            return action ? json(response, 200, { result: 'success', ...action(params) }) : json(response, 200, { result: 'error', message: 'Command Not Found' });
        });
        return;
    }

    if (request.method === 'GET' && url.pathname.startsWith('/paymenter/api/v1/admin/')) {
        const token = (request.headers.authorization ?? '').replace(/^Bearer /, '');
        if (!token) return json(response, 401, { error: 'The request is missing a valid bearer token.' });
        const allowed = PERMISSIONS[token];
        if (!allowed) return json(response, 401, { message: 'The provided API key is invalid or has been disabled.' });
        const [resource, id] = url.pathname.slice('/paymenter/api/v1/admin/'.length).split('/');
        if (!allowed.includes(resource)) return json(response, 403, { message: 'This action is unauthorized.' });
        if (resource !== 'services') return json(response, 404, { message: 'Not found.' });
        const include = includes(url, allowed);
        if (include.error) return json(response, 400, { message: include.error });
        if (id === undefined) {
            const document = serviceDocument(7, include.asked);
            return json(response, 200, { data: [document.data], included: document.included, links: {}, meta: { per_page: Number(url.searchParams.get('per_page') ?? 15) } });
        }
        return services[id] ? json(response, 200, serviceDocument(id, include.asked)) : json(response, 404, { message: 'Not found.' });
    }

    json(response, 404, { message: 'Not found.' });
}).listen(port, () => console.log(`Billing stand-in on http://localhost:${port}`));
