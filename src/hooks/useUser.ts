import { useAuth } from '../contexts/AuthContext';

export const useUser = () => {
  const { user } = useAuth();

  if (!user) {
    throw new Error('User must be authenticated');
  }

  return { userId: user.id, user };
};
