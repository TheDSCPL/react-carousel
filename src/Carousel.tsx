import { noop } from '@babel/types';
import React, {
    Children,
    forwardRef,
    ReactNode,
    memo,
    useState,
    useRef,
    useEffect,
    MouseEventHandler,
    useCallback,
    EventHandler, useDebugValue, TouchEventHandler, UIEvent
} from 'react';
import styled, { CSSProperties } from 'styled-components';

export interface CarouselProps {
    children: ReactNode | ReactNode[];
    //circling?: boolean;

    //behaviour props
    /**
     * The percentage of the component's width that must be moved
     * in a mouse drag for the neighbour slider to snap into view
     * upon drag release
     */
    nextSlideDragSnapMouseTolerance?: number;
    /**
     * The percentage of the component's width that must be moved
     * in a touch drag for the neighbour slider to snap into view
     * upon drag release
     */
    nextSlideDragSnapTouchTolerance?: number;

    //timing props

    /**
     * Transition timing function used for the slides
     */
    transitionTimingFunction?: CSSProperties['transitionTimingFunction'];
    /**
     * Number of milliseconds the transition takes. Set to 0 or NaN to disable the auto slide functionality
     */
    transitionSpeedMs?: number;
    /**
     * Number of milliseconds between slides when auto sliding. Set to 0 or NaN to disable the auto slide functionality
     */
    autoSlideIntervalMs?: number;

    //enabling props

    /**
     * when this is true, the component will listen to touch events
     */
    enableTouchHandling?: boolean;
    /**
     * when this is true, the component will listen to mouse events
     */
    enableMouseHandling?: boolean;
}

interface SliderState {
    clientWidth: undefined|number;
    initialScreenX: undefined|number;
    activeSlide: number;
    translateX: number;
    direction: number;

    animationFrameRequestId: number;

    // undefined unless it's a touch that started the current drag
    touchDraggingId: undefined | number;
}

const requestAnimationFrame: AnimationFrameProvider["requestAnimationFrame"] = (()=>{
    if(typeof window === 'undefined')
        return ()=>0;
    return (
        window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        (window as any).mozRequestAnimationFrame ||
        (window as any).oRequestAnimationFrame ||
        (window as any).msRequestAnimationFrame ||
        function(callback) {
            return window.setTimeout( callback, 1000 / 60 );
        }
    );
})();

const cancelAnimationFrame: AnimationFrameProvider["cancelAnimationFrame"] = (()=>{
    if(typeof window === 'undefined')
        return ()=>{};
    return (
        window.cancelAnimationFrame ||
        window.webkitCancelAnimationFrame ||
        (window as any).mozCancelAnimationFrame ||
        (window as any).oCancelAnimationFrame ||
        (window as any).msCancelAnimationFrame ||
        window.clearTimeout
    );
})();

function updateSliderStyle(sliderRef: React.MutableRefObject<HTMLDivElement>, sliderStateRef: React.MutableRefObject<SliderState>) {
    const prevAnimationFrameRequestId = sliderStateRef.current.animationFrameRequestId;
    if(prevAnimationFrameRequestId) {
        cancelAnimationFrame(prevAnimationFrameRequestId);
    }
    sliderStateRef.current.animationFrameRequestId = requestAnimationFrame(() => {
        sliderStateRef.current.animationFrameRequestId = 0;
        sliderRef.current.style.transform = `translateX(-${100*sliderStateRef.current.activeSlide}%) translateX(${sliderStateRef.current.translateX}px)`;
    });
}

const PlainCarousel = memo(forwardRef<HTMLDivElement, CarouselProps>((props, ref) => {
    // get children
    if (!props.children || typeof props.children!=='object') {
        return null;
    }
    const children = Children.toArray(props.children);
    const nChildren = children.length;
    if(nChildren<=0)
        return null;

    // get auto slide settings
    const {autoSlideIntervalMs, enableTouchHandling, enableMouseHandling, nextSlideDragSnapMouseTolerance, nextSlideDragSnapTouchTolerance} = props;
    const shouldAutoSlide = typeof props.autoSlideIntervalMs ==='number' && props.autoSlideIntervalMs>0 && !Number.isNaN(props.autoSlideIntervalMs);

    const [isDragging, setIsDragging] = useState(false);
    const sliderRef = useRef<HTMLDivElement>();
    const sliderStateRef = useRef<SliderState>({
        clientWidth: undefined,
        initialScreenX: undefined,
        translateX: 0,
        activeSlide: 0,
        direction: shouldAutoSlide ? 1 : 0,
        animationFrameRequestId: 0,
        touchDraggingId: undefined
    });
    const mouseDownHandler: MouseEventHandler<HTMLDivElement> = useCallback(evt => {
        if(sliderStateRef.current.initialScreenX!==undefined || evt.type!=='mousedown')
            return;
        const {clientWidth} = evt.currentTarget;
        sliderStateRef.current.initialScreenX = evt.screenX;
        sliderStateRef.current.clientWidth = clientWidth;
        sliderStateRef.current.touchDraggingId = undefined;
        setIsDragging(true);
        updateSliderStyle(sliderRef, sliderStateRef);
        return false;
    }, []);
    const touchStartHandler: TouchEventHandler<HTMLDivElement> = useCallback(evt => {
        if(sliderStateRef.current.initialScreenX!==undefined || evt.type!=='touchstart')
            return;
        const {currentTarget: {clientWidth}, touches} = evt;
        if(touches.length<=0)
            return;
        const {screenX, identifier} = touches.item(0);
        sliderStateRef.current.initialScreenX = screenX;
        sliderStateRef.current.clientWidth = clientWidth;
        sliderStateRef.current.touchDraggingId = identifier;
        setIsDragging(true);
        updateSliderStyle(sliderRef, sliderStateRef);
        return false;
    }, []);
    const mouseMoveHandler: MouseEventHandler<HTMLDivElement> = useCallback(evt => {
        //if is dragging
        if (sliderStateRef.current.initialScreenX!==undefined) {
            evt.preventDefault();
            //sliderStateRef.current.translateX+=evt.movementX;
            sliderStateRef.current.translateX = evt.screenX - sliderStateRef.current.initialScreenX
            updateSliderStyle(sliderRef, sliderStateRef);
            return false;
        }
    }, []);
    const touchMoveHandler: TouchEventHandler<HTMLDivElement> = useCallback(evt => {
        //if is dragging
        if (sliderStateRef.current.initialScreenX!==undefined && sliderStateRef.current.touchDraggingId!==undefined) {
            //evt.preventDefault();
            const {changedTouches: touches} = evt;
            const nTouches = touches.length;
            for(let i = 0 ; i<nTouches ; ++i) {
                if(touches[i].identifier!==sliderStateRef.current.touchDraggingId)
                    continue;
                const touch = touches[i]
                sliderStateRef.current.translateX = touch.screenX - sliderStateRef.current.initialScreenX
                updateSliderStyle(sliderRef, sliderStateRef);
                break;
            }
            return false;
        }
    }, []);
    const mouseUpHandler: EventHandler<UIEvent<HTMLDivElement>> = useCallback(() => {
        //set direction
        let direction = 0;
        if(sliderStateRef.current.translateX>0) {
            direction = -1;
        } else if(sliderStateRef.current.translateX<0) {
            direction = 1;
        }
        if(Math.abs(sliderStateRef.current.translateX) < sliderStateRef.current.clientWidth*(sliderStateRef.current.touchDraggingId===undefined ? nextSlideDragSnapMouseTolerance : nextSlideDragSnapTouchTolerance)/100) {
            direction=0;
        }
        sliderStateRef.current.direction = direction || sliderStateRef.current.direction;

        //set active slide
        sliderStateRef.current.activeSlide = Math.max(Math.min(sliderStateRef.current.activeSlide+direction, nChildren-1), 0);

        //reset clientWidth, initialScreenX, touchDraggingId and translateX
        sliderStateRef.current.clientWidth = undefined;
        sliderStateRef.current.initialScreenX = undefined;
        sliderStateRef.current.touchDraggingId = undefined;
        sliderStateRef.current.translateX = 0;

        setIsDragging(false);
        updateSliderStyle(sliderRef, sliderStateRef);
    }, [nChildren, nextSlideDragSnapMouseTolerance, nextSlideDragSnapTouchTolerance]);

    //enable mouseMoveHandler and mouseUpHandler when isDragging===true
    useEffect(() => {
        if(!isDragging || (!enableMouseHandling && !enableTouchHandling) || typeof window === 'undefined') {
            return;
        }
        const usingTouch = sliderStateRef.current.touchDraggingId!==undefined;
        if(enableMouseHandling && !usingTouch) {
            window.addEventListener('mousemove', mouseMoveHandler as EventHandler<any>);
            window.addEventListener('mouseup', mouseUpHandler as EventHandler<any>);
        }
        if(enableTouchHandling && usingTouch) {
            window.addEventListener('touchmove', touchMoveHandler as EventHandler<any>);
            window.addEventListener('touchend', mouseUpHandler as EventHandler<any>);
            window.addEventListener('touchcancel', mouseUpHandler as EventHandler<any>);
        }
        return ()=>{
            if(enableMouseHandling && !usingTouch) {
                window.removeEventListener('mousemove', mouseMoveHandler as EventHandler<any>);
                window.removeEventListener('mouseup', mouseUpHandler as EventHandler<any>);
            }
            if(enableTouchHandling && usingTouch) {
                window.removeEventListener('touchmove', touchMoveHandler as EventHandler<any>);
                window.removeEventListener('touchend', mouseUpHandler as EventHandler<any>);
                window.removeEventListener('touchcancel', mouseUpHandler as EventHandler<any>);
            }
        }
    }, [mouseMoveHandler, touchMoveHandler, mouseUpHandler, isDragging, enableTouchHandling, enableMouseHandling])

    //handle enabling and disabling the auto-slide feature
    useEffect(() => {
        //don't enable the auto-slide function if the slider is being dragged or it's disabled on the component's props
        if(!isDragging && shouldAutoSlide) {
            const id = setInterval(() => {
                if(sliderStateRef.current.clientWidth!==undefined) {
                    return;
                }

                let {direction} = sliderStateRef.current;
                if (sliderStateRef.current.activeSlide+direction<0) {
                    direction=1;
                } else if (sliderStateRef.current.activeSlide+direction>=nChildren) {
                    direction=-1;
                }
                sliderStateRef.current.direction = direction;
                sliderStateRef.current.activeSlide += direction;
                updateSliderStyle(sliderRef, sliderStateRef)
            }, autoSlideIntervalMs);
            return () => {
                clearInterval(id);
            }
        }
    }, [autoSlideIntervalMs, nChildren, isDragging, shouldAutoSlide]);

    console.log("Render")
    useDebugValue(isDragging);

    //apply initial slider style
    useEffect(() => {
        updateSliderStyle(sliderRef, sliderStateRef);
        if(typeof window !== 'undefined') {
            const events: Array<keyof WindowEventMap> = ['touchstart', 'touchmove', 'touchend', 'touchcancel'];
            const h = (e: Event) => {
                console.log(e.type)
            };
            events.forEach(e => {
                window.addEventListener(e, h);
            });
            return () => {
                events.forEach(e => {
                    window.removeEventListener(e, h);
                });
            };
        }
    });
    return (
        <div className={(props as any).className} ref={ref}>
            <div ref={sliderRef} data-dragging={isDragging} onMouseDown={mouseDownHandler} onTouchStart={touchStartHandler}>
                {children.map(c => (
                    <article key={(c as any as {key: string}).key}>
                        {c}
                    </article>
                ))}
            </div>
            {/*<div data-dragging={dragging} onMouseDown={mouseDownOrTouchStartHandler} style={{transform: `translateX(-${100*(nChildren-1-slideState.activeSlide)}%) translateX(${-slideState.translateX}px)`}}>
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
        transition: all ${({transitionSpeedMs}) => transitionSpeedMs}ms ${({transitionTimingFunction}) => transitionTimingFunction||'ease'};
        &[data-dragging="true"] {
            //transition-timing-function: linear;
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
    //circling: true,
    nextSlideDragSnapMouseTolerance: 20,
    nextSlideDragSnapTouchTolerance: 15,
    transitionSpeedMs: 500,
    transitionTimingFunction: 'ease',
    autoSlideIntervalMs: 1500,
    enableMouseHandling: true,
    enableTouchHandling: true
}

export default Carousel;
