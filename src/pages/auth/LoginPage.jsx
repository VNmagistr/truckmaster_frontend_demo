const onFinish = async (values) => {
  setLoading(true);
  try {
    const response = await authAPI.login(values.username, values.password);
    
    const userData = {
      username: values.username,
    };
    
    setAuth(userData, response.access, response.refresh);
    
    message.success('Успішний вхід!');
    
    // ВАЖЛИВО: затримка перед navigate
    await new Promise(resolve => setTimeout(resolve, 200));
    
    navigate('/dashboard', { replace: true });
  } catch (error) {
    console.error('Login error:', error);
    message.error('Невірний логін або пароль');
  } finally {
    setLoading(false);
  }
};
