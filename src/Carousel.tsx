import React, {
    Children,
    forwardRef,
    FC,
    ReactNode,
    memo,
    RefObject,
    useState,
    useRef,
    useEffect,
    MouseEvent,
    MouseEventHandler, useCallback, EventHandler
} from 'react';
import styled from 'styled-components';

export interface CarouselProps {
    children?: ReactNode | ReactNode[];
    circling?: boolean;
    transitionSpeedMs?: number;
    autoSlideIntervalMs?: number;
}

interface SlideState {
    clientWidth: undefined|number;
    activeSlide: number;
    translateX: number;
    direction: number;
}

const PlainCarousel = memo(forwardRef<HTMLDivElement, CarouselProps>((props, ref) => {
    if (!props.children || typeof props.children!=='object') {
        return null;
    }
    const {autoSlideIntervalMs} = props;
    const shouldAutoSlide = typeof props.autoSlideIntervalMs ==='number' && props.autoSlideIntervalMs>0 && !Number.isNaN(props.autoSlideIntervalMs);
    const children = Children.toArray(props.children);
    const nChildren = children.length;
    if(nChildren<=0)
        return null;
    const [slideState, setSlideState] = useState<SlideState>({
        clientWidth: undefined,
        translateX: 0,
        activeSlide: 0,
        direction: shouldAutoSlide ? 0 : 1
    });
    const dragging = slideState.clientWidth!==undefined;
    const mouseDownHandler: MouseEventHandler<HTMLDivElement> = useCallback(evt => {
        evt.preventDefault();
        const {clientWidth} = evt.currentTarget;
        setSlideState(ss => ({...ss, clientWidth}));
        return false;
    }, [setSlideState]);
    const mouseMoveHandler: MouseEventHandler<HTMLDivElement> = useCallback(evt => {
        evt.preventDefault();
        const {movementX} = evt;
        setSlideState(ss => ss.clientWidth===undefined?ss:({...ss, translateX: ss.translateX+movementX}));
        return false;
    }, [setSlideState]);
    const mouseUpHandler: MouseEventHandler<HTMLDivElement> = useCallback(evt => {
        evt.preventDefault();
        setSlideState(ss => {
            let direction = ss.translateX>0 ? -1 : ss.translateX<0 ? 1 : 0;
            const translateX = Math.abs(ss.translateX);
            if(translateX < ss.clientWidth/4) {
                direction=0;
            }
            let {activeSlide} = ss;
            activeSlide = Math.max(Math.min(activeSlide+direction, nChildren-1), 0);

            return ({...ss, translateX: 0, clientWidth: undefined, activeSlide, direction: direction||ss.direction});
        });
        return false;
    }, [setSlideState, nChildren]);
    useEffect(() => {
        if(!dragging) {
            return;
        }
        window.addEventListener('mousemove', mouseMoveHandler as EventHandler<any>);
        window.addEventListener('mouseup', mouseUpHandler as EventHandler<any>);
        return ()=>{
            window.removeEventListener('mousemove', mouseMoveHandler as EventHandler<any>);
            window.removeEventListener('mouseup', mouseUpHandler as EventHandler<any>);
        }
    }, [mouseMoveHandler, mouseUpHandler, dragging])

    useEffect(() => {
        console.log(dragging, shouldAutoSlide)
        if(dragging || !shouldAutoSlide) {
            return;
        }
        const id = setInterval(() => {
            setSlideState(ss => {
                if(ss.clientWidth!==undefined) {
                    return ss;
                }
                let {direction} = ss;
                if (ss.activeSlide+direction<0) {
                    direction=1;
                } else if (ss.activeSlide+direction>=nChildren) {
                    direction=-1;
                }
                return {
                    ...ss,
                    activeSlide: ss.activeSlide+direction,
                    direction
                };
            })
        }, autoSlideIntervalMs);
        return () => {
            clearInterval(id);
        }
    }, [autoSlideIntervalMs, nChildren, dragging, shouldAutoSlide]);

    console.log("Render")

    return (
        <div className={(props as any).className} ref={ref}>
            <div data-dragging={dragging} onMouseDown={mouseDownHandler} style={{transform: `translateX(-${100*slideState.activeSlide}%) translateX(${slideState.translateX}px)`}}>
                {children.map(c => (
                    <article key={(c as any as {key: string}).key}>
                        {c}
                    </article>
                ))}
            </div>
            {/*<div data-dragging={dragging} onMouseDown={mouseDownHandler} style={{transform: `translateX(-${100*(nChildren-1-slideState.activeSlide)}%) translateX(${-slideState.translateX}px)`}}>
                {children.map(c => (
                    <article key={(c as any as {key: string}).key}>
                        {c}
                    </article>
                ))}
            </div>*/}
        </div>
    )
}));

const Carousel = styled(PlainCarousel)`
    //Carousel window
    position: relative;
    overflow: hidden;
    >div {
        //Slider
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        position: static;
        height: 100%;
        min-width: 100%;
        transition: all ${({transitionSpeedMs}) => transitionSpeedMs}ms ease;
        &[data-dragging="true"] {
            transition: none;
        }
        >article {
            //Slide
            position: relative;
            overflow: hidden;
            height: 100%; //100% two levels up
            width: 100%; //100% two levels up
            min-height: 100%; //100% two levels up
            min-width: 100%; //100% two levels up
            max-height: 100%; //100% two levels up
            max-width: 100%; //100% two levels up
            flex-shrink: 0;
        }
    }
`;

Carousel.defaultProps = {
    circling: true,
    transitionSpeedMs: 500,
    autoSlideIntervalMs: 1500
}

export default Carousel;
