import { useEffect, useRef, useState } from 'react';

interface PlaceResult {
  street: string;
  city: string;
  state: string;
  zip: string;
  formatted: string;
}

export function useGooglePlaces(
  onPlaceSelected: (place: PlaceResult) => void
) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.warn('Google Maps API key not found. Address autocomplete disabled.');
      return;
    }

    // Load Google Maps script
    const loadGoogleMaps = async () => {
      try {
        // Check if script is already loaded
        if (!(window as any).google) {
          // Check if script tag already exists
          const existingScript = document.querySelector(
            'script[src^="https://maps.googleapis.com/maps/api/js"]'
          );

          if (!existingScript) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);

            await new Promise((resolve, reject) => {
              script.onload = resolve;
              script.onerror = reject;
            });
          } else {
            // Script exists, wait for it to load
            await new Promise<void>((resolve) => {
              const checkGoogle = setInterval(() => {
                if ((window as any).google) {
                  clearInterval(checkGoogle);
                  resolve();
                }
              }, 100);
            });
          }
        }

        setIsLoaded(true);

        if (!inputRef.current) return;

        // Initialize autocomplete
        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          componentRestrictions: { country: 'us' },
          fields: ['address_components', 'formatted_address'],
        });

        // Listen for place selection
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();
          if (!place || !place.address_components) return;

          // Extract address components
          let street = '';
          let city = '';
          let state = '';
          let zip = '';

          for (const component of place.address_components) {
            const types = component.types;

            if (types.includes('street_number')) {
              street = component.long_name + ' ';
            }
            if (types.includes('route')) {
              street += component.long_name;
            }
            if (types.includes('locality')) {
              city = component.long_name;
            }
            if (types.includes('administrative_area_level_1')) {
              state = component.short_name;
            }
            if (types.includes('postal_code')) {
              zip = component.long_name;
            }
          }

          onPlaceSelected({
            street: street.trim(),
            city,
            state,
            zip,
            formatted: place.formatted_address || '',
          });
        });
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    loadGoogleMaps();

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onPlaceSelected]);

  return { inputRef, isLoaded };
}
