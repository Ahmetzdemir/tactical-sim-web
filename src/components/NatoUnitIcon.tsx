import React from 'react'
import { SoldierRole, EnemyType } from '../engine/types'

interface NatoUnitIconProps {
  role?: SoldierRole
  type?: EnemyType
  isEnemy: boolean
  isAlive?: boolean
  size?: number
  className?: string
}

export const NatoUnitIcon: React.FC<NatoUnitIconProps> = ({
  role,
  type,
  isEnemy,
  isAlive = true,
  size = 24,
  className = '',
}) => {
  // Determine color based on side and status
  const strokeColor = !isAlive 
    ? '#4b5563' // Gray for K.I.A.
    : isEnemy 
      ? '#ef4444' // Red for hostile
      : '#00ff00' // Green for friendly

  const fillColor = !isAlive
    ? 'rgba(75, 85, 99, 0.05)'
    : isEnemy
      ? 'rgba(239, 68, 68, 0.1)'
      : 'rgba(0, 255, 0, 0.1)'

  // Map roles and enemy types to uniform internal roles for drawing
  const unitRole = role || (type === EnemyType.INFANTRY ? SoldierRole.RIFLEMAN : 
                             type === EnemyType.ARMORED ? SoldierRole.ARMORED :
                             type === EnemyType.SNIPER ? SoldierRole.SNIPER :
                             type === EnemyType.MG ? SoldierRole.MG : SoldierRole.RIFLEMAN)

  // Render the inner tactical symbol geometry
  const renderSymbol = () => {
    switch (unitRole) {
      case SoldierRole.RIFLEMAN:
        // Crossed lines (Infantry)
        return isEnemy ? (
          <>
            <line x1="28" y1="28" x2="72" y2="72" stroke={strokeColor} strokeWidth="3" />
            <line x1="72" y1="28" x2="28" y2="72" stroke={strokeColor} strokeWidth="3" />
          </>
        ) : (
          <>
            <line x1="20" y1="20" x2="80" y2="80" stroke={strokeColor} strokeWidth="3" />
            <line x1="80" y1="20" x2="20" y2="80" stroke={strokeColor} strokeWidth="3" />
          </>
        )

      case SoldierRole.MEDIC:
        // Geneva Cross (Medic)
        return isEnemy ? (
          <>
            <line x1="50" y1="32" x2="50" y2="68" stroke={strokeColor} strokeWidth="6" strokeLinecap="square" />
            <line x1="32" y1="50" x2="68" y2="50" stroke={strokeColor} strokeWidth="6" strokeLinecap="square" />
          </>
        ) : (
          <>
            <line x1="50" y1="28" x2="50" y2="72" stroke={strokeColor} strokeWidth="7" strokeLinecap="square" />
            <line x1="28" y1="50" x2="72" y2="50" stroke={strokeColor} strokeWidth="7" strokeLinecap="square" />
          </>
        )

      case SoldierRole.ENGINEER:
        // Bridge shape (Engineer)
        return isEnemy ? (
          <path d="M 32,58 L 32,46 L 68,46 L 68,58 M 32,52 L 68,52" fill="none" stroke={strokeColor} strokeWidth="4" />
        ) : (
          <path d="M 26,62 L 26,45 L 74,45 L 74,62 M 26,52 L 74,52" fill="none" stroke={strokeColor} strokeWidth="4" />
        )

      case SoldierRole.ARMORED:
        // Ellipse (Armored/Tank tracks)
        return (
          <ellipse cx="50" cy="50" rx="18" ry="9" fill="none" stroke={strokeColor} strokeWidth="4" />
        )

      case SoldierRole.SNIPER:
        // Crosshair reticle (Sniper)
        return (
          <>
            <circle cx="50" cy="50" r="12" fill="none" stroke={strokeColor} strokeWidth="3" />
            <line x1="30" y1="50" x2="70" y2="50" stroke={strokeColor} strokeWidth="2" />
            <line x1="50" y1="30" x2="50" y2="70" stroke={strokeColor} strokeWidth="2" />
          </>
        )

      case SoldierRole.MG:
        // Heavy infantry / machine gun (Infantry cross + horizontal bottom bar)
        return isEnemy ? (
          <>
            <line x1="28" y1="28" x2="72" y2="72" stroke={strokeColor} strokeWidth="3" />
            <line x1="72" y1="28" x2="28" y2="72" stroke={strokeColor} strokeWidth="3" />
            <line x1="35" y1="62" x2="65" y2="62" stroke={strokeColor} strokeWidth="5" />
          </>
        ) : (
          <>
            <line x1="20" y1="20" x2="80" y2="80" stroke={strokeColor} strokeWidth="3" />
            <line x1="80" y1="20" x2="20" y2="80" stroke={strokeColor} strokeWidth="3" />
            <line x1="28" y1="68" x2="72" y2="68" stroke={strokeColor} strokeWidth="5" />
          </>
        )

      default:
        return null
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`select-none pointer-events-none ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      {/* Outer frame */}
      {isEnemy ? (
        // Hostile: Diamond
        <path
          d="M 50,10 L 90,50 L 50,90 L 10,50 Z"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="4"
          strokeLinejoin="miter"
        />
      ) : (
        // Friendly: Square/Rectangle
        <rect
          x="12"
          y="12"
          width="76"
          height="76"
          rx="4"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="4"
        />
      )}

      {/* Role-specific Inner symbol */}
      {renderSymbol()}

      {/* K.I.A. slash overlay */}
      {!isAlive && (
        <line
          x1="10"
          y1="10"
          x2="90"
          y2="90"
          stroke="#ef4444"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.85"
        />
      )}
    </svg>
  )
}
