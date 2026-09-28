import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { rsvpApi } from '../../services/api';
import { Heart, Check, Loader2, ChevronDown } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const QUICK_LABELS = { yes: "you'll be there", no: "you can't make it", maybe: "maybe" };
const TRAVEL_LABELS = {
  flight: {
    travelWord: 'Flight', placeWord: 'Airport', placeExample: 'e.g., Indira Gandhi International Airport',
    numberLabel: 'Flight Number', numberExample: 'e.g., AI202', gateWord: 'Terminal', gateExample: 'e.g., T3',
  },
  train: {
    travelWord: 'Train', placeWord: 'Station', placeExample: 'e.g., New Delhi Railway Station',
    numberLabel: 'Train Number / Name', numberExample: 'e.g., 12345 Shatabdi Express', gateWord: 'Platform', gateExample: 'e.g., Platform 4',
  },
  ship: {
    travelWord: 'Ship', placeWord: 'Port', placeExample: 'e.g., Mumbai Port',
    numberLabel: 'Ship / Cruise Name', numberExample: 'e.g., Queen Mary 2', gateWord: 'Terminal', gateExample: 'e.g., Terminal 1',
  },
  other: {
    travelWord: 'Travel', placeWord: 'Airport / Station', placeExample: 'Airport or station name',
    numberLabel: 'Flight / Train Number', numberExample: 'e.g., AI202 or 12345', gateWord: 'Terminal / Platform', gateExample: 'e.g., T3 or Platform 4',
  },
};

export default function PublicRsvpForm() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm();
  const selectedTravelMode = watch('travel_mode');
  const partySize = Math.max(1, parseInt(watch('party_size'), 10) || 1);

  useEffect(() => {
    rsvpApi.getPublicForm(token)
      .then(r => {
        setFormData(r.data.data);
        const quick = searchParams.get('quick');
        if (quick && QUICK_LABELS[quick]) {
          toast.success(`Got it — we've marked that ${QUICK_LABELS[quick]}!`);
        }
      })
      .catch(err => setError(err.response?.status === 404 ? 'invalid' : 'error'))
      .finally(() => setLoading(false));
  }, [token]);

  const onSubmit = async (data) => {
    try {
      const questions = formData?.questions || [];
      const responses = (data.events || []).map(ev => {
        const custom_answers = {};
        questions.forEach(q => {
          if (!q.event_id || q.event_id === ev.event_id) {
            const val = data.custom_answers?.[q.id];
            if (val !== undefined && val !== '') custom_answers[q.id] = val;
          }
        });
        return {
          event_id: ev.event_id,
          attending: ev.attending,
          custom_answers,
        };
      });

      await rsvpApi.submitRsvp(token, {
        responses,
        arrival_datetime: data.arrival_datetime,
        departure_datetime: data.departure_datetime,
        travel_mode: data.travel_mode,
        travel_details: data.travel_details,
        arrival_location: data.arrival_location,
        departure_location: data.departure_location,
        departure_travel_number: data.departure_travel_number,
        arrival_terminal: data.arrival_terminal,
        departure_terminal: data.departure_terminal,
        arrival_ticket_details: data.arrival_ticket_details,
        departure_ticket_details: data.departure_ticket_details,
        luggage_count: data.luggage_count,
        party_size: data.party_size,
        party_member_names: (data.party_member_names || []).filter(Boolean),
        plus_one_name: data.plus_one_name,
      });
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit RSVP');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-primary-400" />
    </div>
  );

  if (error === 'invalid') return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center text-center px-4">
      <div>
        <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-serif font-bold text-gray-700">Invalid RSVP Link</h1>
        <p className="text-gray-500 mt-2">This RSVP link is invalid or has expired. Please contact the couple directly.</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center text-center px-4">
      <div>
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-gray-800">RSVP Submitted! 🎉</h1>
        <p className="text-gray-500 mt-3 text-lg">Thank you, {formData?.guest?.first_name}! We can't wait to celebrate with you.</p>
        {formData?.couple?.custom_slug && (
          <a href={`/w/${formData.couple.custom_slug}`} className="mt-8 inline-block btn-primary">
            View Our Wedding Website
          </a>
        )}
      </div>
    </div>
  );

  if (!formData) return null;

  const { guest, couple, events, questions, already_submitted_for = [], travel_info = [] } = formData;
  const arrivalDefault = guest?.arrival_datetime
    ? format(new Date(guest.arrival_datetime), "yyyy-MM-dd'T'HH:mm")
    : '';
  const departureDefault = guest?.departure_datetime
    ? format(new Date(guest.departure_datetime), "yyyy-MM-dd'T'HH:mm")
    : '';

  // Labels adapt to the selected travel mode (airport/terminal vs station/platform)
  const modeLabels = TRAVEL_LABELS[selectedTravelMode ?? guest?.travel_mode] || TRAVEL_LABELS.other;
  const { travelWord, placeWord, placeExample, numberLabel, numberExample, gateWord, gateExample } = modeLabels;

  // An invite email for a specific event links here with ?event=<id> so the
  // page opens scoped to just that event, even if the guest has since been
  // granted access to others via a separate invite. "View all" reveals them.
  const eventFilterId = searchParams.get('event');
  const isFiltered = !showAllEvents && eventFilterId && events?.some(e => e.id === eventFilterId);
  const visibleEvents = isFiltered ? events.filter(e => e.id === eventFilterId) : events;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-white">
      {/* Header */}
      <div className="text-center py-12 px-4">
        <Heart className="w-8 h-8 text-primary-500 fill-primary-500 mx-auto mb-4" />
        <h1 className="text-4xl font-serif font-bold text-gray-900">
          {couple?.bride_name} & {couple?.groom_name}
        </h1>
        <p className="text-gray-500 mt-2 text-lg">
          {couple?.wedding_date ? format(new Date(couple.wedding_date), 'MMMM d, yyyy') : ''}
        </p>
        <div className="w-16 h-0.5 bg-primary-300 mx-auto mt-6" />
      </div>

      {/* Guest Greeting */}
      <div className="max-w-2xl mx-auto px-4 pb-12">
        <div className="card p-6 mb-6 text-center">
          <h2 className="text-2xl font-serif font-semibold text-gray-800">
            Hi {guest?.first_name}! 👋
          </h2>
          <p className="text-gray-500 mt-2">
            You're invited to celebrate with {couple?.bride_name} & {couple?.groom_name}. Please fill out your RSVP below.
          </p>
        </div>

        {/* Travel & Hotel info provided by the couple */}
        {travel_info.length > 0 && (
          <div className="card p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">Where You'll Be Staying & Getting There</h3>
            <div className="space-y-4">
              {travel_info.map(t => (
                <div key={t.id} className="border border-gray-100 rounded-xl p-4">
                  <p className="font-medium text-gray-800">{t.title}</p>
                  {t.hotel_name && <p className="text-sm text-gray-600 mt-1">{t.hotel_name}</p>}
                  {t.description && <p className="text-sm text-gray-500 mt-1">{t.description}</p>}
                  {t.discount_code && <p className="text-sm text-gray-500 mt-1">Discount code: <strong>{t.discount_code}</strong></p>}
                  <div className="flex gap-4 mt-2">
                    {t.booking_link && <a href={t.booking_link} target="_blank" rel="noreferrer" className="text-sm text-primary-500 hover:underline">Book now</a>}
                    {t.hotel_url && <a href={t.hotel_url} target="_blank" rel="noreferrer" className="text-sm text-primary-500 hover:underline">Website</a>}
                    {t.maps_link && <a href={t.maps_link} target="_blank" rel="noreferrer" className="text-sm text-primary-500 hover:underline">Map</a>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isFiltered && events.length > 1 && (
          <button
            type="button"
            onClick={() => setShowAllEvents(true)}
            className="text-sm text-primary-500 hover:underline mb-4"
          >
            You're invited to {events.length} events — view all and RSVP to each
          </button>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* RSVP per event */}
          {visibleEvents?.map((event, idx) => (
            <div key={event.id} className="card p-6">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-800 text-lg">{event.title}</h3>
                {already_submitted_for.includes(event.id) && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Already responded</span>
                )}
              </div>
              {event.start_time && <p className="text-sm text-gray-500 mb-1">{format(new Date(event.start_time), 'PPp')}</p>}
              {(event.venue_name || event.address) && (
                <div className="mb-4">
                  {event.venue_name && <p className="text-sm text-gray-700 font-medium">{event.venue_name}</p>}
                  {event.address && <p className="text-sm text-gray-400">{event.address}</p>}
                  <a
                    href={event.maps_embed_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.venue_name, event.address].filter(Boolean).join(', '))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary-500 hover:underline"
                  >
                    📍 Get Directions
                  </a>
                </div>
              )}

              <div className="mb-4">
                <label className="label">Will you be attending? *</label>
                <div className="flex gap-3">
                  {[{ val: 'yes', label: '✅ Yes, I\'ll be there!' }, { val: 'no', label: '❌ Sorry, can\'t make it' }, { val: 'maybe', label: '🤔 Maybe' }].map(opt => (
                    <label key={opt.val} className="flex items-center gap-2 cursor-pointer border border-gray-200 rounded-xl px-3 py-2 text-sm hover:border-primary-300 transition-colors has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 flex-1 justify-center text-center">
                      <input {...register(`events.${idx}.attending`, { required: true })} type="radio" value={opt.val} className="sr-only" />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <input type="hidden" {...register(`events.${idx}.event_id`)} value={event.id} />
            </div>
          ))}

          {/* Travel Details (applies once, not per event) */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-800 mb-1">Your Travel Details</h3>
            <p className="text-sm text-gray-500 mb-4">This helps us plan pickups and logistics — fill in what you know, update later if plans change.</p>
            <div>
              <label className="label">Mode of Travel</label>
              <select {...register('travel_mode')} defaultValue={guest?.travel_mode || ''} className="input-field">
                <option value="">Select mode</option>
                <option value="flight">✈️ Flight</option>
                <option value="train">🚆 Train</option>
                <option value="ship">🚢 Ship</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Arrival */}
            <div className="mt-5 rounded-xl border border-gray-100 p-4">
              <h4 className="font-medium text-gray-700 mb-3">🛬 Arrival</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Date & Time of Arrival</label>
                  <input {...register('arrival_datetime')} type="datetime-local" defaultValue={arrivalDefault} className="input-field" />
                  <p className="text-xs text-gray-400 mt-1">{travelWord === 'Flight' ? 'Flight landing time' : 'Arrival time'}</p>
                </div>
                <div>
                  <label className="label">{placeWord} Name</label>
                  <input {...register('arrival_location')} defaultValue={guest?.arrival_location || ''} placeholder={placeExample} className="input-field" />
                </div>
                <div>
                  <label className="label">{numberLabel}</label>
                  <input {...register('travel_details')} defaultValue={guest?.travel_details || ''} placeholder={numberExample} className="input-field" />
                </div>
                <div>
                  <label className="label">{gateWord} Number</label>
                  <input {...register('arrival_terminal')} defaultValue={guest?.arrival_terminal || ''} placeholder={gateExample} className="input-field" />
                </div>
              </div>
              <div className="mt-4">
                <label className="label">Arrival Ticket Details</label>
                <input {...register('arrival_ticket_details')} defaultValue={guest?.arrival_ticket_details || ''} placeholder={`${travelWord} ticket / PNR / booking reference`} className="input-field" />
              </div>
            </div>

            {/* Departure */}
            <div className="mt-4 rounded-xl border border-gray-100 p-4">
              <h4 className="font-medium text-gray-700 mb-3">🛫 Departure</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Date & Time of Departure</label>
                  <input {...register('departure_datetime')} type="datetime-local" defaultValue={departureDefault} className="input-field" />
                  <p className="text-xs text-gray-400 mt-1">{travelWord === 'Flight' ? 'Flight take-off time' : 'Departure time'}</p>
                </div>
                <div>
                  <label className="label">{placeWord} Name</label>
                  <input {...register('departure_location')} defaultValue={guest?.departure_location || ''} placeholder={placeExample} className="input-field" />
                </div>
                <div>
                  <label className="label">{numberLabel}</label>
                  <input {...register('departure_travel_number')} defaultValue={guest?.departure_travel_number || ''} placeholder={numberExample} className="input-field" />
                </div>
                <div>
                  <label className="label">{gateWord} Number</label>
                  <input {...register('departure_terminal')} defaultValue={guest?.departure_terminal || ''} placeholder={gateExample} className="input-field" />
                </div>
              </div>
              <div className="mt-4">
                <label className="label">Departure Ticket Details</label>
                <input {...register('departure_ticket_details')} defaultValue={guest?.departure_ticket_details || ''} placeholder={`${travelWord} ticket / PNR / booking reference`} className="input-field" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Number of Passengers (PAX, including you)</label>
                <input {...register('party_size')} type="number" min={1} defaultValue={guest?.party_size || 1} className="input-field" />
              </div>
              <div>
                <label className="label">Number of Luggage / Baggage</label>
                <input {...register('luggage_count')} type="number" min={0} defaultValue={guest?.luggage_count ?? ''} placeholder="e.g., 3" className="input-field" />
              </div>
            </div>
            {partySize > 1 && (
              <div className="mt-4 space-y-3">
                <label className="label">Names of the {partySize - 1} guest{partySize - 1 !== 1 ? 's' : ''} joining you</label>
                {Array.from({ length: partySize - 1 }).map((_, i) => (
                  <input
                    key={i}
                    {...register(`party_member_names.${i}`)}
                    defaultValue={guest?.party_member_names?.[i] || ''}
                    placeholder={`Guest ${i + 2} full name`}
                    className="input-field"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Plus One */}
          {guest?.plus_one_allowed && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Your Plus One</h3>
              <div>
                <label className="label">Plus One's Name</label>
                <input {...register('plus_one_name')} defaultValue={guest?.plus_one_name || ''} placeholder="Guest's full name" className="input-field" />
              </div>
            </div>
          )}

          {/* Custom Questions */}
          {questions?.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-800 mb-4">A Few More Questions</h3>
              <div className="space-y-4">
                {questions.map(q => (
                  <div key={q.id}>
                    <label className="label">{q.question_text}{q.is_required && <span className="text-red-500 ml-1">*</span>}</label>
                    {q.question_type === 'text' && <input {...register(`custom_answers.${q.id}`, { required: q.is_required })} className="input-field" />}
                    {q.question_type === 'number' && <input {...register(`custom_answers.${q.id}`, { required: q.is_required })} type="number" className="input-field" />}
                    {q.question_type === 'select' && (
                      <select {...register(`custom_answers.${q.id}`, { required: q.is_required })} className="input-field">
                        <option value="">Select an option</option>
                        {q.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                    {q.question_type === 'radio' && (
                      <div className="flex flex-wrap gap-2">
                        {q.options?.map(o => (
                          <label key={o} className="flex items-center gap-2 cursor-pointer border border-gray-200 rounded-lg px-3 py-2 text-sm hover:border-primary-300 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50">
                            <input {...register(`custom_answers.${q.id}`, { required: q.is_required })} type="radio" value={o} />
                            {o}
                          </label>
                        ))}
                      </div>
                    )}
                    {q.question_type === 'checkbox' && (
                      <div className="flex flex-wrap gap-2">
                        {q.options?.map(o => (
                          <label key={o} className="flex items-center gap-2 cursor-pointer border border-gray-200 rounded-lg px-3 py-2 text-sm hover:border-primary-300">
                            <input {...register(`custom_answers.${q.id}`)} type="checkbox" value={o} />
                            {o}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Heart className="w-5 h-5 fill-white" />}
            Submit RSVP
          </button>
        </form>
      </div>
    </div>
  );
}

