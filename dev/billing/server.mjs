// A stand-in for WHMCS and Paymenter on the development panel: the parts of their APIs the Billing
// block reads, with one service in each, numbered 7, owned by client 3, with an unpaid invoice.
//
//   node dev/billing/server.mjs        # listens on http://localhost:8460
//
// WHMCS: URL http://localhost:8460/whmcs, API identifier "dev", API secret "dev".
// Paymenter: URL http://localhost:8460/paymenter, API key "dev" (or "services", which may only view services).
// Give a server the external ID 7 to see its service.
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
const INCLUDES = { services: { product: 'products', invoices: 'invoices', user: 'users', order: 'orders', coupon: 'coupons', properties: 'properties' }, products: { 'plans.prices': 'products', category: 'categories', services: 'services' } };

const paymenter = {
    service: {
        id: '7',
        type: 'services',
        attributes: { id: 7, quantity: 1, price: '14.99', status: 'active', currency_code: 'EUR', expires_at: `${due(-2)}T00:00:00.000000Z`, label: null },
        relationships: { product: { data: { type: 'products', id: '2' } }, invoices: { data: [{ type: 'invoices', id: '80' }, { type: 'invoices', id: '88' }] } },
    },
    product: {
        id: '2',
        type: 'products',
        attributes: { id: 2, name: 'Diamond Plan', slug: 'diamond' },
        relationships: { plans: { data: [{ type: 'plans', id: '4' }, { type: 'plans', id: '5' }] } },
    },
    included: {
        invoices: [
            { id: '80', type: 'invoices', attributes: { id: 80, status: 'paid', currency_code: 'EUR', due_at: `${due(-32)}T00:00:00.000000Z` } },
            { id: '88', type: 'invoices', attributes: { id: 88, status: 'pending', currency_code: 'EUR', due_at: `${due(-2)}T00:00:00.000000Z` } },
        ],
        plans: [
            { id: '4', type: 'plans', attributes: { id: 4, name: 'Monthly', type: 'recurring', billing_period: 1, billing_unit: 'month' }, relationships: { prices: { data: [{ type: 'prices', id: '9' }] } } },
            { id: '5', type: 'plans', attributes: { id: 5, name: 'Yearly', type: 'recurring', billing_period: 1, billing_unit: 'year' }, relationships: { prices: { data: [{ type: 'prices', id: '10' }] } } },
        ],
        prices: [
            { id: '9', type: 'prices', attributes: { id: 9, price: '14.99', setup_fee: null, currency_code: 'EUR' } },
            { id: '10', type: 'prices', attributes: { id: 10, price: '149.90', setup_fee: null, currency_code: 'EUR' } },
        ],
    },
};

/** The includes asked for, or an error as Paymenter's query builder gives it for one the key may not view. */
const includes = (resource, url, allowed) => {
    const asked = (url.searchParams.get('include') ?? '').split(',').filter(Boolean);
    const permitted = Object.entries(INCLUDES[resource]).filter(([, permission]) => allowed.includes(permission)).map(([name]) => name);
    const refused = asked.filter((name) => !permitted.includes(name));
    return refused.length ? { error: `Requested include(s) \`${refused.join(', ')}\` are not allowed. Allowed include(s) are \`${permitted.join(', ')}\`.` } : { asked };
};

/** A service document with what was asked included, as Paymenter's resources write it. */
const serviceDocument = (asked) => {
    const relationships = Object.fromEntries(Object.entries(paymenter.service.relationships).filter(([name]) => asked.includes(name)));
    const included = [...(asked.includes('product') ? [paymenter.product] : []), ...(asked.includes('invoices') ? paymenter.included.invoices : [])];
    return { data: { ...paymenter.service, relationships }, included };
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
        const include = INCLUDES[resource] ? includes(resource, url, allowed) : { asked: [] };
        if (include.error) return json(response, 400, { message: include.error });
        if (resource === 'services' && id === undefined) {
            const document = serviceDocument(include.asked);
            return json(response, 200, { data: [document.data], included: document.included, links: {}, meta: { per_page: Number(url.searchParams.get('per_page') ?? 15) } });
        }
        if (resource === 'services') return id === '7' ? json(response, 200, serviceDocument(include.asked)) : json(response, 404, { message: 'Not found.' });
        if (resource === 'products' && id === '2') {
            const plans = include.asked.includes('plans.prices');
            return json(response, 200, {
                data: plans ? paymenter.product : { ...paymenter.product, relationships: {} },
                included: plans ? [...paymenter.included.plans, ...paymenter.included.prices] : [],
            });
        }
    }

    json(response, 404, { message: 'Not found.' });
}).listen(port, () => console.log(`Billing stand-in on http://localhost:${port}`));
