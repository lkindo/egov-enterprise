import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../../../../lib/logger';

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
        },
    });
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const resolvedParams = await params;
    const path = resolvedParams.path.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `http://localhost:8080/${path}${searchParams ? '?' + searchParams : ''}`;

    const headers = new Headers();
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
        headers.set('Authorization', authHeader);
    }
    headers.set('Accept', request.headers.get('Accept') || 'application/json');

    logger.info(`[Proxy GET] ${url}`);

    try {
        const response = await fetch(url, { headers });

        const data = await response.text();

        return new NextResponse(data, {
            status: response.status,
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        logger.error('Proxy error:', error);
        return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const resolvedParams = await params;
    const path = resolvedParams.path.join('/');
    const url = `http://localhost:8080/${path}`;
    const body = await request.text();

    const headers = new Headers();
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
        headers.set('Authorization', authHeader);
    }
    headers.set('Content-Type', request.headers.get('Content-Type') || 'application/json');
    headers.set('Accept', request.headers.get('Accept') || 'application/json');

    logger.info(`[Proxy POST] ${url}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body,
        });

        const data = await response.text();

        return new NextResponse(data, {
            status: response.status,
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        logger.error('Proxy error:', error);
        return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
    }
}