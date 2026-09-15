import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Camera, Users, Calendar, Mail, MapPin, Star, Check, ChevronRight } from 'lucide-react';

const features = [
  { icon: Users, title: 'Guest Management', desc: 'Import, organize, and manage your entire guest list with CSV support and party grouping.' },
  { icon: Check, title: 'Smart RSVPs', desc: 'Custom RSVP forms with meal choices, dietary needs, and per-event attendance tracking.' },
  { icon: Camera, title: 'Live Photo Sharing', desc: 'Guests upload photos in real-time. Stream them live on venue screens during your event.' },
  { icon: Heart, title: 'Custom Website', desc: 'Pick from stunning themes and build your perfect wedding website in minutes.' },
  { icon: MapPin, title: 'Travel & Hotels', desc: 'Share accommodation links, discount codes, and interactive maps for your guests.' },
  { icon: Mail, title: 'Digital Invitations', desc: 'Send beautiful email and SMS invitations that match your wedding theme perfectly.' },
];

const steps = [
  { num: '01', title: 'Create Your Profile', desc: 'Sign up and enter your wedding details — names, date, and love story.' },
  { num: '02', title: 'Customize Your Site', desc: 'Pick a theme, customize colors and fonts, add your events and travel info.' },
  { num: '03', title: 'Invite Your Guests', desc: 'Send personalized invitations and manage RSVPs from your dashboard.' },
];

const testimonials = [
  { name: 'Priya & Rahul', text: 'SaveTheDate made our wedding planning so much easier! The live photo stream at our reception was a huge hit.', rating: 5 },
  { name: 'Sneha & Arjun', text: 'We loved the custom RSVP forms. Managing 350 guests was a breeze with the guest list tools.', rating: 5 },
  { name: 'Meera & Vikram', text: 'The website editor is incredible. We had a gorgeous wedding site up in less than an hour!', rating: 5 },
];

const plans = [
  { name: 'Free', price: '0', features: ['1 Event', 'Up to 50 Guests', 'Basic RSVP', 'Photo Gallery', 'Wedding Website'], cta: 'Get Started', highlight: false },
  { name: 'Premium', price: '29', features: ['5 Events', 'Unlimited Guests', 'Custom RSVP Questions', 'Live Photo Stream', 'Email Invitations', 'All Themes'], cta: 'Start Free Trial', highlight: true },
  { name: 'Elite', price: '49', features: ['Unlimited Events', 'Unlimited Guests', 'SMS Invitations', 'Custom Domain', 'Priority Support', 'Everything in Premium'], cta: 'Go Elite', highlight: false },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-primary-500 fill-primary-500" />
            <span className="text-xl font-serif font-bold text-gray-900">SaveTheDate</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#features" className="hover:text-primary-500 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-primary-500 transition-colors">How it Works</a>
            <a href="#pricing" className="hover:text-primary-500 transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-primary-500 transition-colors">Sign In</Link>
            <Link to="/register" className="btn-primary text-sm">Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-rose-50 via-white to-gold-50 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full bg-primary-100 opacity-30 animate-float"
              style={{ width: `${40 + i * 20}px`, height: `${40 + i * 20}px`, left: `${10 + i * 15}%`, top: `${20 + (i % 3) * 20}%`, animationDelay: `${i * 0.5}s` }} />
          ))}
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <span className="badge badge-pink mb-4">✨ The #1 Wedding Platform</span>
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-gray-900 leading-tight mt-4">
              Your Dream Wedding,<br />
              <span className="text-primary-500">Your Way</span>
            </h1>
            <p className="mt-6 text-xl text-gray-500 max-w-2xl mx-auto">
              Create stunning wedding websites, manage guests, track RSVPs, and share live photos — all in one beautiful platform.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => navigate('/register')} className="btn-primary text-base py-3 px-8 flex items-center gap-2 justify-center">
                Start For Free <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => navigate('/w/demo')} className="btn-secondary text-base py-3 px-8">
                See a Demo Website
              </button>
            </div>
            <p className="mt-4 text-sm text-gray-400">No credit card required • Free forever plan available</p>
          </motion.div>

          {/* Dashboard Preview */}
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.3 }}
            className="mt-16 mx-auto max-w-5xl">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <div className="flex-1 bg-white rounded-full px-4 py-1 text-xs text-gray-400 text-center ml-2">savethedate.com/dashboard</div>
              </div>
              <div className="p-6 bg-gradient-to-br from-rose-50 to-white min-h-48 flex items-center justify-center">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
                  {[{label:'Total Guests',val:'247',color:'bg-primary-50 text-primary-600'},{label:'Attending',val:'189',color:'bg-green-50 text-green-600'},{label:'Photos',val:'432',color:'bg-blue-50 text-blue-600'},{label:'Days Left',val:'42',color:'bg-gold-50 text-gold-600'}].map(s => (
                    <div key={s.label} className={`${s.color} rounded-xl p-4 text-center`}>
                      <p className="text-2xl font-bold font-serif">{s.val}</p>
                      <p className="text-xs mt-1 opacity-75">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title">Everything You Need for Your Big Day</h2>
          <p className="section-subtitle">All the tools to plan, share, and celebrate your wedding in one place.</p>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }} viewport={{ once: true }}
                className="card p-6 hover:shadow-lg transition-shadow group">
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-100 transition-colors">
                  <f.icon className="w-6 h-6 text-primary-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 bg-rose-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title">Get Started in 3 Simple Steps</h2>
          <p className="section-subtitle">Your wedding website and app ready in minutes, not days.</p>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-10">
            {steps.map((s, i) => (
              <motion.div key={s.num} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: i * 0.2 }} viewport={{ once: true }}
                className="text-center">
                <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-white font-bold text-lg">{s.num}</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{s.title}</h3>
                <p className="text-gray-500">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title">Loved by Couples Everywhere</h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }} viewport={{ once: true }}
                className="card p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, j) => <Star key={j} className="w-4 h-4 fill-gold-400 text-gold-400" />)}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                    <Heart className="w-4 h-4 text-primary-500 fill-primary-500" />
                  </div>
                  <span className="font-semibold text-gray-800 text-sm">{t.name}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title">Simple, Transparent Pricing</h2>
          <p className="section-subtitle">Start free, upgrade when you need more.</p>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((p) => (
              <div key={p.name} className={`card p-8 ${p.highlight ? 'ring-2 ring-primary-500 relative' : ''}`}>
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge badge-pink px-4 py-1 text-xs">Most Popular</span>
                )}
                <h3 className="text-xl font-bold text-gray-900">{p.name}</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold font-serif text-gray-900">\${p.price}</span>
                  {p.price !== '0' && <span className="text-gray-500 text-sm">/month</span>}
                  {p.price === '0' && <span className="text-gray-500 text-sm"> forever</span>}
                </div>
                <ul className="space-y-3 mb-8">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-primary-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/register" className={`block text-center py-2.5 rounded-full font-semibold text-sm transition-all ${p.highlight ? 'btn-primary' : 'btn-secondary'}`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-primary-500">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-serif font-bold text-white">Start Planning Your Dream Wedding Today</h2>
          <p className="mt-4 text-primary-100 text-lg">Join thousands of couples who've already used SaveTheDate.</p>
          <Link to="/register" className="mt-8 inline-block bg-white text-primary-500 font-bold px-10 py-3 rounded-full hover:bg-primary-50 transition-colors">
            Create Your Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary-500 fill-primary-500" />
              <span className="font-serif font-bold text-white text-lg">SaveTheDate</span>
            </div>
            <p className="text-sm">© 2024 SaveTheDate. Made with ❤️ for couples everywhere.</p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

