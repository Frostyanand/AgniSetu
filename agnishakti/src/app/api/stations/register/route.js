import { NextResponse } from 'next/server';
import { registerFireStation } from '@/app/backend'; // Use your actual path to backend.js

export async function POST(request) {
    try {
        // Providers must supply the secret key to register
        const providerSecret = request.headers.get('x-provider-secret');
        console.log('Provider secret received:', !!providerSecret);
        console.log('Expected provider secret:', !!process.env.PROVIDER_SECRET);
        
        if (providerSecret !== process.env.PROVIDER_SECRET) {
            return NextResponse.json({ error: 'Invalid provider secret' }, { status: 403 });
        }

        const body = await request.json();
        const { email, name, stationName, stationAddress, stationPhone, coords } = body;
        console.log('Station register request:', { email, name, stationName, stationAddress, stationPhone, coords });

        // Validate that all required fields are present
        if (!email || !name || !stationName || !stationAddress || !stationPhone || !coords || !coords.lat || !coords.lng) {
            console.log('Missing required fields:', { 
                email: !!email, 
                name: !!name, 
                stationName: !!stationName, 
                stationAddress: !!stationAddress, 
                stationPhone: !!stationPhone, 
                coords: !!coords,
                coordsLat: !!(coords && coords.lat),
                coordsLng: !!(coords && coords.lng)
            });
            return NextResponse.json({ error: 'Missing required fields for station registration' }, { status: 400 });
        }

        const result = await registerFireStation(body);
        console.log('Fire station registered successfully:', result);
        return NextResponse.json(result);

    } catch (error) {
        console.error("Failed to register fire station:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
