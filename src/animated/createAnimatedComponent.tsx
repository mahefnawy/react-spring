import React, {
  ComponentPropsWithRef,
  forwardRef,
  MutableRefObject,
  ReactType,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import { handleRef, useForceUpdate } from '../shared/helpers'
import AnimatedProps from './AnimatedProps'
import { animatedApi, applyAnimatedValues } from './Globals'

type AnimatedValue<T> = {
  getValue: () => T
}

type AnimateProperties<T extends object | undefined> = {
  [P in keyof T]: AnimatedValue<T[P]> | T[P]
}

type AnimateStyleProp<P extends object> = P extends { style?: object }
  ?
      | P
      | (P extends { style: object }
          ? Record<'style', AnimateProperties<P['style']>>
          : Partial<Record<'style', AnimateProperties<P['style']>>>)
  : P

type ScrollProps = {
  scrollLeft?: AnimatedValue<number>
  scrollTop?: AnimatedValue<number>
}

type AnimatedComponentProps<C extends ReactType> = JSX.LibraryManagedAttributes<
  C,
  AnimateStyleProp<ComponentPropsWithRef<C>> & ScrollProps
>

export default function createAnimatedComponent<C extends ReactType>(
  Component: C
) {
  const AnimatedComponent = forwardRef<C, AnimatedComponentProps<C>>(
    (props, ref) => {
      const forceUpdate = useForceUpdate()
      const mounted = useRef(true)
      const propsAnimated: MutableRefObject<any> = useRef(null)
      const node: MutableRefObject<C | null> = useRef(null)
      const attachProps = useCallback(props => {
        const oldPropsAnimated = propsAnimated.current
        const callback = () => {
          if (node.current) {
            const didUpdate = applyAnimatedValues.fn(
              node.current,
              propsAnimated.current.getAnimatedValue()
            )
            if (didUpdate === false) forceUpdate()
          }
        }
        propsAnimated.current = new AnimatedProps(props, callback)
        oldPropsAnimated && oldPropsAnimated.detach()
      }, [])

      useEffect(
        () => () => {
          mounted.current = false
          propsAnimated.current && propsAnimated.current.detach()
        },
        []
      )
      useImperativeHandle<C, any>(ref, () =>
        animatedApi(node as MutableRefObject<C>, mounted, forceUpdate)
      )
      attachProps(props)

      const {
        scrollTop,
        scrollLeft,
        ...animatedProps
      } = propsAnimated.current.getValue()
      return (
        <Component
          {...animatedProps as typeof props}
          ref={(childRef: C) => (node.current = handleRef(childRef, ref))}
        />
      )
    }
  )
  return AnimatedComponent
}
