import useTilt from '../hooks/useTilt'

export default function TiltCard({ as: Tag = 'div', className = '', children, ...rest }) {
  const ref = useTilt(8)
  return (
    <Tag ref={ref} className={`tilt ${className}`} {...rest}>
      {children}
    </Tag>
  )
}
