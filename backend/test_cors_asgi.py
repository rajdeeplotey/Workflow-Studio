import asyncio
import main

async def test():
    scope = {
        'type': 'http',
        'method': 'OPTIONS',
        'path': '/pipelines/parse',
        'headers': [
            (b'origin', b'http://localhost:3000'),
            (b'access-control-request-method', b'POST'),
            (b'access-control-request-headers', b'content-type')
        ]
    }
    status = None
    headers = {}

    async def send(m):
        nonlocal status
        if m['type'] == 'http.response.start':
            status = m['status']
            for k, v in m.get('headers', []):
                headers[k.decode().lower()] = v.decode()

    async def receive():
        return {'type': 'http.request', 'body': b''}

    await main.app(scope, receive, send)
    print(f"Preflight status: {status}")
    print(f"Access-Control-Allow-Origin: {headers.get('access-control-allow-origin')}")
    assert status == 200
    assert headers.get('access-control-allow-origin') == 'http://localhost:3000'

    # Test 127.0.0.1 origin as well
    scope['headers'][0] = (b'origin', b'http://127.0.0.1:3000')
    headers.clear()
    await main.app(scope, receive, send)
    print(f"127.0.0.1 Preflight status: {status}")
    print(f"127.0.0.1 Access-Control-Allow-Origin: {headers.get('access-control-allow-origin')}")
    assert status == 200
    assert headers.get('access-control-allow-origin') == 'http://127.0.0.1:3000'
    print("All CORS preflight checks passed successfully!")

if __name__ == '__main__':
    asyncio.run(test())
