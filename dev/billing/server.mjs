// A stand-in for WHMCS and Paymenter on the development panel: the parts of their APIs the Billing
// block reads, with one service in each, numbered 7, owned by client 3, with an unpaid invoice.
//
//   node dev/billing/server.mjs        # listens on http://localhost:8460
//
// WHMCS: URL http://localhost:8460/whmcs, API identifier "dev", API secret "dev".
// Paymenter: URL http://localhost:8460/paymenter, API key "dev".
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
    GetClientsDetails: () => ({ client: { id: 3, currency_code: 'USD', currency_prefix: '$', currency_suffix: ' USD' } }),
    GetInvoices: () => ({ invoices: { invoice: [{ id: 1042, duedate: due(5), total: '14.99', status: 'Unpaid' }, { id: 1043, duedate: due(9), total: '4.00', status: 'Unpaid' }] } }),
    GetInvoice: ({ invoiceid }) => ({
        id: Number(invoiceid),
        items: { item: [invoiceid === '1042' ? { type: 'Hosting', relid: 7 } : { type: 'Addon', relid: 2 }] },
    }),
};

const paymenter = {
    service: () => ({
        data: {
            id: '7',
            type: 'services',
            attributes: { status: 'active', price: '14.99', currency_code: 'EUR', expires_at: `${due(-2)}T00:00:00.000000Z`, user_id: 3 },
            relationships: { product: { data: { id: '2', type: 'products' } }, plan: { data: { id: '4', type: 'plans' } } },
        },
        included: [
            { id: '2', type: 'products', attributes: { name: 'Diamond Plan' } },
            { id: '4', type: 'plans', attributes: { name: 'Monthly', type: 'recurring', billing_period: 1, billing_unit: 'month' } },
        ],
    }),
    invoices: () => ({
        data: [{ id: '88', type: 'invoices', attributes: { status: 'pending', due_at: `${due(-2)}T00:00:00.000000Z` }, relationships: { items: { data: [{ id: '501', type: 'invoice_items' }] } } }],
        included: [{ id: '501', type: 'invoice_items', attributes: { reference_type: 'App\\Models\\Service', reference_id: 7, price: '14.99' } }],
    }),
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
        if (request.headers.authorization !== 'Bearer dev') return json(response, 401, { message: 'Unauthenticated.' });
        const path = url.pathname.slice('/paymenter/api/v1/admin/'.length);
        if (path === 'services') return json(response, 200, { data: [paymenter.service().data] });
        if (path === 'services/7') return json(response, 200, paymenter.service());
        if (path.startsWith('services/')) return json(response, 404, { message: 'Not found.' });
        if (path === 'invoices') return json(response, 200, paymenter.invoices());
    }

    json(response, 404, { message: 'Not found.' });
}).listen(port, () => console.log(`Billing stand-in on http://localhost:${port}`));
