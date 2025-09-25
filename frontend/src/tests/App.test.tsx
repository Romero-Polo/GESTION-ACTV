import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';

// Wrapper component for router
const AppWithRouter = () => (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

describe('App', () => {
  it('renders the main header', () => {
    render(<AppWithRouter />);

    const headerElement = screen.getByText(/Gestión de Actividad Laboral/i);
    expect(headerElement).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(<AppWithRouter />);

    const dashboardLink = screen.getByText(/Dashboard/i);
    const actividadesLink = screen.getByText(/Actividades/i);

    expect(dashboardLink).toBeInTheDocument();
    expect(actividadesLink).toBeInTheDocument();
  });

  it('renders homepage content by default', () => {
    render(<AppWithRouter />);

    const welcomeText = screen.getByText(/Bienvenido al sistema de gestión de actividad laboral/i);
    expect(welcomeText).toBeInTheDocument();
  });

  it('renders dashboard cards', () => {
    render(<AppWithRouter />);

    const actividadesCard = screen.getByText(/Actividades de Hoy/i);
    const jornadasCard = screen.getByText(/Jornadas Abiertas/i);
    const horasCard = screen.getByText(/Total Horas Mes/i);

    expect(actividadesCard).toBeInTheDocument();
    expect(jornadasCard).toBeInTheDocument();
    expect(horasCard).toBeInTheDocument();
  });

  it('displays initial zero values in dashboard', () => {
    render(<AppWithRouter />);

    const zeroValues = screen.getAllByText('0');
    expect(zeroValues).toHaveLength(3);
  });
});