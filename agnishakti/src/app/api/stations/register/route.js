import { NextResponse } from 'next/server';
import { registerFireStation } from '@/app/backend'; // Use your actual path to backend.js

export async function POST(request) {
    try {
        // Providers must supply the secret key to register
        const providerSecret = request.headers.get('x-provider-secret');
        if (providerSecret !== process.env.PROVIDER_SECRET) {
            return NextResponse.json({ error: 'Invalid provider secret' }, { status: 403 });
        }

        const body = await request.json();
        const { email, name, stationName, stationAddress, stationPhone, coords } = body;

        // Validate that all required fields are present
        if (!email || !name || !stationName || !stationAddress || !coords || !coords.lat || !coords.lng) {
            return NextResponse.json({ error: 'Missing required fields for station registration' }, { status: 400 });
        }

        const result = await registerFireStation(body);
        return NextResponse.json(result);

    } catch (error) {
        console.error("Failed to register fire station:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
