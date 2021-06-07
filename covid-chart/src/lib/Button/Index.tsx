import React, { ReactElement } from 'react'
import cx from 'classnames'
import styles from './Button.module.scss'

type Variants =
| 'primary'
| 'outline'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactElement | string,
  variant: Variants
}

const Button = ({children, onClick, variant}: Props) => {
  return (
    <button
      type="button"
      className={cx(styles.button, styles[variant])}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default Button
