import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Heart, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const schema = z.object({
  bride_name: z.string().min(1, 'Bride name required'),
  groom_name: z.string().min(1, 'Groom name required'),
  wedding_date: z.string().min(1, 'Wedding date required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] });

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    try {
      const { confirmPassword, ...payload } = data;
      await registerUser(payload);
      toast.success('Welcome to SaveTheDate! 💕 Let\'s start planning!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <Heart className="w-7 h-7 text-primary-500 fill-primary-500" />
            <span className="text-2xl font-serif font-bold text-gray-900">SaveTheDate</span>
          </Link>
          <h1 className="text-3xl font-serif font-bold text-gray-900">Start Your Journey</h1>
          <p className="text-gray-500 mt-2">Create your free wedding platform account</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Bride's Name *</label>
                <input {...register('bride_name')} placeholder="Priya" className="input-field" />
                {errors.bride_name && <p className="text-red-500 text-xs mt-1">{errors.bride_name.message}</p>}
              </div>
              <div>
                <label className="label">Groom's Name *</label>
                <input {...register('groom_name')} placeholder="Rahul" className="input-field" />
                {errors.groom_name && <p className="text-red-500 text-xs mt-1">{errors.groom_name.message}</p>}
              </div>
            </div>
            <div>
              <label className="label">Wedding Date *</label>
              <input {...register('wedding_date')} type="date" className="input-field" />
              {errors.wedding_date && <p className="text-red-500 text-xs mt-1">{errors.wedding_date.message}</p>}
            </div>
            <div>
              <label className="label">Email Address *</label>
              <input {...register('email')} type="email" placeholder="you@example.com" className="input-field" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Password *</label>
              <div className="relative">
                <input {...register('password')} type={showPwd ? 'text' : 'password'} placeholder="Min 6 characters" className="input-field pr-10" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="label">Confirm Password *</label>
              <input {...register('confirmPassword')} type="password" placeholder="Re-enter password" className="input-field" />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating Account...</> : '✨ Create Free Account'}
            </button>
          </form>
          <p className="text-center text-xs text-gray-400 mt-4">
            By registering, you agree to our Terms of Service and Privacy Policy.
          </p>
          <p className="text-center text-sm text-gray-500 mt-3">
            Already have an account? <Link to="/login" className="text-primary-500 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

