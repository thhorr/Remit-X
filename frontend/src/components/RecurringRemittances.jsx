import { Clock } from 'lucide-react';

const RecurringRemittances = () => {
  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Clock className="w-6 h-6 text-orange-600 mr-3" />
        <h2 className="text-xl font-semibold text-gray-900">Recurring Remittances</h2>
      </div>
      <div className="text-center py-12">
        <p className="text-gray-500">Set up automatic payments with Chainlink Automation!</p>
      </div>
    </div>
  );
};

export default RecurringRemittances;
