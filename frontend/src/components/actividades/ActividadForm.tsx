import React, { useState, useEffect } from 'react';
import { useActividades, type CreateActividadData, type UpdateActividadData, type Actividad, type ValidationResult, type TimeSlot } from '../../hooks/useActividades';
import { useObras } from '../../hooks/useObras';
import { useTiposActividad } from '../../hooks/useTiposActividad';
import { useAuth } from '../../hooks/useAuth';

interface ActividadFormProps {
  actividad?: Actividad;
  onSuccess?: (actividad: Actividad) => void;
  onCancel?: () => void;
}

export const ActividadForm: React.FC<ActividadFormProps> = ({
  actividad,
  onSuccess,
  onCancel
}) => {
  const { user } = useAuth();
  const {
    createActividad,
    updateActividad,
    getAccessibleRecursos,
    validateActividad,
    getSuggestedTimeSlots,
    loading,
    error
  } = useActividades();
  const { getActiveObras } = useObras();
  const { getTiposActividad } = useTiposActividad();

  const [formData, setFormData] = useState<CreateActividadData>({
    obraId: 0,
    recursoId: 0,
    tipoActividadId: 0,
    fechaInicio: new Date().toISOString().split('T')[0],
    horaInicio: '08:00',
    fechaFin: '',
    horaFin: '',
    observaciones: ''
  });

  const [jornadaAbierta, setJornadaAbierta] = useState(false);
  const [obras, setObras] = useState<any[]>([]);
  const [recursos, setRecursos] = useState<any[]>([]);
  const [tiposActividad, setTiposActividad] = useState<any[]>([]);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [suggestedSlots, setSuggestedSlots] = useState<TimeSlot[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [validating, setValidating] = useState(false);

  const isEditing = !!actividad;

  useEffect(() => {
    loadFormData();
  }, []);

  useEffect(() => {
    if (actividad) {
      setFormData({
        obraId: actividad.obra.id,
        recursoId: actividad.recurso.id,
        tipoActividadId: actividad.tipoActividad.id,
        fechaInicio: actividad.fechaInicio,
        horaInicio: actividad.horaInicio,
        fechaFin: actividad.fechaFin || '',
        horaFin: actividad.horaFin || '',
        observaciones: actividad.observaciones || ''
      });
      setJornadaAbierta(!actividad.fechaFin || !actividad.horaFin);
    }
  }, [actividad]);

  const loadFormData = async () => {
    const [obrasData, recursosData, tiposActividadData] = await Promise.all([
      getActiveObras(),
      getAccessibleRecursos(),
      getTiposActividad(true)
    ]);

    setObras(obrasData);
    setRecursos(recursosData);
    setTiposActividad(tiposActividadData);

    // Set default values if not editing
    if (!actividad && recursosData.length > 0) {
      setFormData(prev => ({ ...prev, recursoId: recursosData[0].id }));
    }
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.obraId) {
      errors.obraId = 'Selecciona una obra';
    }

    if (!formData.recursoId) {
      errors.recursoId = 'Selecciona un recurso';
    }

    if (!formData.tipoActividadId) {
      errors.tipoActividadId = 'Selecciona un tipo de actividad';
    }

    if (!formData.fechaInicio) {
      errors.fechaInicio = 'La fecha de inicio es obligatoria';
    }

    if (!formData.horaInicio) {
      errors.horaInicio = 'La hora de inicio es obligatoria';
    }

    if (!jornadaAbierta) {
      if (!formData.fechaFin) {
        errors.fechaFin = 'La fecha de fin es obligatoria para jornadas cerradas';
      }

      if (!formData.horaFin) {
        errors.horaFin = 'La hora de fin es obligatoria para jornadas cerradas';
      }

      // Validate end time is after start time
      if (formData.fechaInicio && formData.horaInicio && formData.fechaFin && formData.horaFin) {
        const startDateTime = new Date(`${formData.fechaInicio}T${formData.horaInicio}`);
        const endDateTime = new Date(`${formData.fechaFin}T${formData.horaFin}`);

        if (endDateTime <= startDateTime) {
          errors.fechaFin = 'La fecha y hora de fin debe ser posterior a la de inicio';
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData = {
      ...formData,
      fechaFin: jornadaAbierta ? undefined : formData.fechaFin,
      horaFin: jornadaAbierta ? undefined : formData.horaFin
    };

    let result: Actividad | null = null;

    if (isEditing && actividad) {
      result = await updateActividad(actividad.id, submitData as UpdateActividadData);
    } else {
      result = await createActividad(submitData);
    }

    if (result) {
      onSuccess?.(result);
    }
  };

  const handleInputChange = (field: keyof CreateActividadData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Clear previous validation results
    setValidationResult(null);
    setShowSuggestions(false);

    // Trigger real-time validation for time fields
    if (['fechaInicio', 'horaInicio', 'fechaFin', 'horaFin', 'recursoId'].includes(field)) {
      // Reduced debounce time for faster validation response
      setTimeout(() => {
        performRealTimeValidation({ ...formData, [field]: value });
      }, 150);
    }
  };

  const performRealTimeValidation = async (data: CreateActividadData) => {
    if (!data.recursoId || !data.fechaInicio || !data.horaInicio) {
      return;
    }

    setValidating(true);
    const result = await validateActividad(data, isEditing ? actividad?.id : undefined);

    if (result) {
      setValidationResult(result);

      // If there's an overlap, suggest alternative time slots
      if (result.hasOverlap && data.fechaInicio) {
        const suggestions = await getSuggestedTimeSlots(data.recursoId, data.fechaInicio, 60);
        setSuggestedSlots(suggestions);
        setShowSuggestions(true);
      }
    }
    setValidating(false);
  };

  const applySuggestedSlot = (slot: TimeSlot) => {
    setFormData(prev => ({
      ...prev,
      horaInicio: slot.start,
      ...(prev.fechaFin && prev.horaFin && { horaFin: slot.end })
    }));
    setShowSuggestions(false);
    setValidationResult(null);
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute of [0, 15, 30, 45]) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeString);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">
        {isEditing ? 'Editar Actividad' : 'Nueva Actividad'}
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Real-time Validation Results */}
      {validating && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4 flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
          Validando solapamiento...
        </div>
      )}

      {validationResult && validationResult.hasOverlap && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-2">
              <h3 className="text-sm font-medium">Conflicto de horarios detectado</h3>
              <div className="mt-1 text-sm">
                {validationResult.message}
              </div>
            </div>
          </div>
        </div>
      )}

      {validationResult && !validationResult.hasOverlap && formData.recursoId && formData.fechaInicio && formData.horaInicio && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 flex items-center">
          <svg className="h-5 w-5 text-green-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Horario disponible - No hay conflictos
        </div>
      )}

      {/* Suggested Time Slots */}
      {showSuggestions && suggestedSlots.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 rounded mb-4">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            Horarios sugeridos disponibles:
          </h3>
          <div className="space-y-2">
            {suggestedSlots.map((slot, index) => (
              <button
                key={index}
                type="button"
                onClick={() => applySuggestedSlot(slot)}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 mr-2 mb-2"
              >
                {slot.start} - {slot.end}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Obra */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Obra *
            </label>
            <select
              value={formData.obraId}
              onChange={(e) => handleInputChange('obraId', parseInt(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.obraId ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value={0}>Selecciona una obra</option>
              {obras.map(obra => (
                <option key={obra.id} value={obra.id}>
                  {obra.codigo} - {obra.descripcion}
                </option>
              ))}
            </select>
            {formErrors.obraId && (
              <p className="text-red-500 text-sm mt-1">{formErrors.obraId}</p>
            )}
          </div>

          {/* Recurso */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recurso *
            </label>
            <select
              value={formData.recursoId}
              onChange={(e) => handleInputChange('recursoId', parseInt(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.recursoId ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value={0}>Selecciona un recurso</option>
              {recursos.map(recurso => (
                <option key={recurso.id} value={recurso.id}>
                  {recurso.codigo} - {recurso.nombre}
                </option>
              ))}
            </select>
            {formErrors.recursoId && (
              <p className="text-red-500 text-sm mt-1">{formErrors.recursoId}</p>
            )}
          </div>

          {/* Tipo Actividad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Actividad *
            </label>
            <select
              value={formData.tipoActividadId}
              onChange={(e) => handleInputChange('tipoActividadId', parseInt(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.tipoActividadId ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value={0}>Selecciona un tipo</option>
              {tiposActividad.map(tipo => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.codigo} - {tipo.nombre}
                </option>
              ))}
            </select>
            {formErrors.tipoActividadId && (
              <p className="text-red-500 text-sm mt-1">{formErrors.tipoActividadId}</p>
            )}
          </div>

          {/* Fecha Inicio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Inicio *
            </label>
            <input
              type="date"
              value={formData.fechaInicio}
              onChange={(e) => handleInputChange('fechaInicio', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.fechaInicio ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {formErrors.fechaInicio && (
              <p className="text-red-500 text-sm mt-1">{formErrors.fechaInicio}</p>
            )}
          </div>

          {/* Hora Inicio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hora de Inicio *
            </label>
            <select
              value={formData.horaInicio}
              onChange={(e) => handleInputChange('horaInicio', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.horaInicio ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              {timeOptions.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
            {formErrors.horaInicio && (
              <p className="text-red-500 text-sm mt-1">{formErrors.horaInicio}</p>
            )}
          </div>

          {/* Jornada Abierta Checkbox */}
          <div className="md:col-span-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="jornadaAbierta"
                checked={jornadaAbierta}
                onChange={(e) => setJornadaAbierta(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="jornadaAbierta" className="ml-2 block text-sm text-gray-700">
                Jornada abierta (sin hora de fin)
              </label>
            </div>
          </div>

          {/* Fecha Fin - only show if not jornada abierta */}
          {!jornadaAbierta && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Fin *
                </label>
                <input
                  type="date"
                  value={formData.fechaFin}
                  onChange={(e) => handleInputChange('fechaFin', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.fechaFin ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {formErrors.fechaFin && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.fechaFin}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora de Fin *
                </label>
                <select
                  value={formData.horaFin}
                  onChange={(e) => handleInputChange('horaFin', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.horaFin ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Selecciona hora de fin</option>
                  {timeOptions.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
                {formErrors.horaFin && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.horaFin}</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Observaciones */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observaciones
          </label>
          <textarea
            value={formData.observaciones}
            onChange={(e) => handleInputChange('observaciones', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Observaciones adicionales sobre la actividad..."
            maxLength={1000}
          />
          <div className="text-sm text-gray-500 mt-1">
            {formData.observaciones.length}/1000 caracteres
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
          </button>
        </div>
      </form>
    </div>
  );
};