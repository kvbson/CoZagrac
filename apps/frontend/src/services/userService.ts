export const userService = {
  checkAuth: async () => {
    try {
      const response = await fetch('/api/user/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      const userData = await response.json();
      if (response.ok) {
        return userData;
      }
      return null;
    } catch (error: unknown) {
      console.log(error);
      return null;
    }
  },
};
