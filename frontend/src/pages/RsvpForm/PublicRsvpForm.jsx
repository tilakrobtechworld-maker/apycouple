import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { rsvpApi } from '../../services/api';
import { Heart, Check, Loader2, ChevronDown } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function PublicRsvpForm() {
  const { token } = useParams();
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();

  useEffect(() => {
    rsvpApi.getPublicForm(token)
      .then(r => setFormData(r.data.data))
      .catch(err => setError(err.response?.status === 404 ? 'invalid' : 'error'))
      .finally(() => setLoading(false));
  }, [token]);

  const onSubmit = async (data) => {
    try {
      await rsvpApi.submitRsvp(token, data);
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

  const { guest, couple, events, questions } = formData;

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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* RSVP per event */}
          {events?.map((event, idx) => (
            <div key={event.id} className="card p-6">
              <h3 className="font-semibold text-gray-800 text-lg mb-1">{event.title}</h3>
              {event.start_time && <p className="text-sm text-gray-500 mb-1">{format(new Date(event.start_time), 'PPp')}</p>}
              {event.venue_name && <p className="text-sm text-gray-400 mb-4">{event.venue_name}</p>}

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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="label">Meal Choice</label>
                  <select {...register(`events.${idx}.meal_choice`)} className="input-field">
                    <option value="">Select meal</option>
                    <option value="vegetarian">Vegetarian</option>
                    <option value="non_vegetarian">Non-Vegetarian</option>
                    <option value="vegan">Vegan</option>
                    <option value="jain">Jain</option>
                    <option value="no_preference">No Preference</option>
                  </select>
                </div>
                <div>
                  <label className="label">Song Request</label>
                  <input {...register(`events.${idx}.song_request`)} placeholder="A song you'd love to dance to..." className="input-field" />
                </div>
              </div>

              <div className="mt-4">
                <label className="label">Dietary Requirements or Notes</label>
                <input {...register(`events.${idx}.dietary_note`)} placeholder="Allergies, dietary restrictions..." className="input-field" />
              </div>
            </div>
          ))}

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

