/* FILE: extensions/plugins/gesture-vision-plugin-dashboard/frontend/ui/DashboardSelector.tsx */
import React from 'react';
import { Dropdown } from '#frontend/components/shared/Dropdown.js';
import { setIcon } from '#frontend/ui/helpers/ui-helpers.js';

interface DashboardSelectorOption {
  id: string;
  label: string;
}

interface DashboardSelectorProps {
  id: string;
  triggerIcon: string;
  activeLabel: string;
  options: DashboardSelectorOption[];
  onSelect: (id: string) => void;
  activeId: string | null;
}

export const DashboardSelector: React.FC<DashboardSelectorProps> = ({
  id,
  triggerIcon,
  activeLabel,
  options,
  onSelect,
  activeId,
}) => {
  const trigger = (
    <button id={`${id}-trigger`} className="btn btn-secondary px-2 desktop:px-4" title={activeLabel}>
      <span ref={el => el && setIcon(el, triggerIcon)}></span>
      <span className="truncate hidden desktop:inline">{activeLabel}</span>
      <span ref={el => el && setIcon(el, 'UI_ARROW_DROP_DOWN')}></span>
    </button>
  );

  return (
    <Dropdown id={id} trigger={trigger}>
      {options
        .filter(opt => opt.id !== activeId)
        .map(({ id: optionId, label }) => (
          <button
            key={optionId}
            id={`${id}-option-${optionId}`}
            onClick={() => onSelect(optionId)}
            className="btn btn-secondary w-full justify-start"
          >
            {label}
          </button>
        ))}
    </Dropdown>
  );
};