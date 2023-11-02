import { useContext, useState, useEffect, memo, createElement, createContext, useCallback, useRef } from "react";

import { EditorContext } from "./appContext";
import { MousePositionContext } from "./mouseTracker";
import { funnyConstants, dispatcher, placementStringFromXYWH } from "../../Utils";
import { listen } from "@tauri-apps/api/event";

const GridControllerContext = createContext(() => {});

// memoized version of gridElement
// prevents rerenders when parents are updated
export const GridElementMemo = memo(GridElement);

export function GridElement({id, children, position}) {
    const gridControllerCallback = useContext(GridControllerContext);
    const { isLayoutLocked } = useContext(EditorContext);
    const { x, y, h, w } = position;
    const placement = placementStringFromXYWH({ x, y, h, w });

    const move = useCallback(
        () => {
            gridControllerCallback({callerId: id, direction: "", initialPlacement: {...position}});
        },
        [gridControllerCallback, id, position]
    );

    const resize = useCallback(
        (direction) => {
            gridControllerCallback({callerId: id, direction, initialPlacement: {...position}});
        },
        [gridControllerCallback, id, position]
    );

    return (
        <div className="grid-element" style={{position: "relative", gridArea: placement}}>
            {isLayoutLocked ?
                <>{children}</>
                :
                <>
                    <div style={{
                        zIndex: "3",
                        width: "100%",
                        height: "100%",
                        position: "absolute",
                        opacity: "0.95",
                        alignItems: "center",
                        display: "grid",
                        gridTemplateColumns: "1fr 4fr 1fr",
                        gridTemplateRows: "1fr 4fr 1fr",
                        textAlign: "center",
                        }}
                        className="form-subscript"
                        title={id}
                    >
                        {/* top left */}
                        <div
                            onMouseDown={() => {resize('ul')}}
                            style={{background: "gray", width: "100%", height: "100%", cursor: "nw-resize"}}
                        >
                        </div>
                        {/* neutral good */}
                        <div
                            onMouseDown={() => {resize('u')}}
                            style={{background: "dimgrey", width: "100%", height: "100%", cursor: "n-resize"}}
                        >
                        </div>
                        {/* top right */}
                        <div
                            onMouseDown={() => {resize('ur')}}
                            style={{background: "gray", width: "100%", height: "100%", cursor: "ne-resize"}}
                        >
                        </div>
                        {/* lawful neutral */}
                        <div
                            onMouseDown={() => {resize('l')}}
                            style={{background: "dimgrey", width: "100%", height: "100%", cursor: "w-resize"}}
                        >
                        </div>
                        {/* center */}
                        <div
                            onMouseDown={() => {move()}}
                            style={{background: "gray", width: "100%", height: "100%", cursor: "move"}}
                        >
                            { id === undefined ?
                                null
                                :
                                <div style={{height: "40px", textOverflow:"ellipsis", overflow: "hidden"}}>id: {id}</div>
                            }
                        </div>
                        {/* chaotic neutral */}
                        <div
                            onMouseDown={() => {resize('r')}}
                            style={{background: "dimgrey", width: "100%", height: "100%", cursor: "e-resize"}}
                        >
                        </div>
                        {/* bottom left */}
                        <div
                            onMouseDown={() => {resize('ld')}}
                            style={{background: "gray", width: "100%", height: "100%", cursor: "sw-resize"}}
                        >
                        </div>
                        {/* neutral evil */}
                        <div
                            onMouseDown={() => {resize('d')}}
                            style={{background: "dimgrey", width: "100%", height: "100%", cursor: "s-resize"}}
                        >
                        </div>
                        {/* bottom right */}
                        <div
                            onMouseDown={() => {resize('rd')}}
                            style={{background: "gray", width: "100%", height: "100%", cursor: "se-resize"}}
                        >
                        </div>
                    </div>
                </>
            }
        </div>
    );
};

// the plan is to move grid controlling behaviour here to prevent excessive rerenders of grid elements and their children
// character sheet tracks mouse position, and shares it through mousePosition context
export function GridController({children, gridData}) {
    const [direction, setDirection] = useState("");
    const [activeElementId, setActiveElementId] = useState("");
    const [initialGhostPlacement, setInitialGhostPlacement] = useState({});
    const [backendGhostStyle, setBackendGhostStyle] = useState({display: "none"});

    const gridControllerCallback = useCallback(
        ({callerId, direction, initialPlacement}) => {
            setDirection(direction);
            setActiveElementId(callerId);
            setInitialGhostPlacement(initialPlacement);
        },
        []
    );

    const releaseCallback = useCallback(
        (action) => {
            if (activeElementId === "") {
                return;
            }
            const {dx, dy, dh, dw} = action;
            const {x, y, h, w} = gridData[activeElementId];
            const id = activeElementId;
            let newH = h + (dh ?? 0);
            newH = newH < 1 ? 1 : newH;
            let newW = w + (dw ?? 0);
            newW = newW < 1 ? 1 : newW;
            let newX = x + (dx ?? 0);
            if (newX < 1) {
                newX = x;
                newW = w;
            }
            let newY = y + (dy ?? 0);
            if (newY < 1) {
                newY = x;
                newH = w;
            }

            setDirection("");
            setActiveElementId("");
            setInitialGhostPlacement({});
            dispatcher({type: "grid-merge", id, value: {"x": newX, "y": newY, "h": newH, "w": newW}});
        },
        [gridData, activeElementId]
    )

    const BackendGhost = createElement("div", {
        style: {
            opacity: "0.5",
            zIndex: "11",
            position: "relative",
            ...backendGhostStyle
        },
    });

    useEffect( // requests data and subscribes to changes
        () => {
            const onEvent = (e) => {
                const data = e.payload;
                console.log(data);
                setBackendGhostStyle(data);
            }

            const unlisten = listen("draw_ghost", onEvent);
            return () => {
                unlisten.then(f => f());
            };
        },
        []
    )

    if (activeElementId=== "") { // does nothing
        return (
            <GridControllerContext.Provider value={gridControllerCallback}>
                {BackendGhost}
                {children}
            </GridControllerContext.Provider>
        )
    }

    const controllerMode = direction === "" ? MovingController : ResizingController;

    const controller = createElement(controllerMode, {id: activeElementId, direction, releaseCallback, initialGhostPlacement});

    return (
        <GridControllerContext.Provider value={gridControllerCallback}>
            {BackendGhost}
            {controller}
            {children}
        </GridControllerContext.Provider>
    )
};

function MovingController({releaseCallback, initialGhostPlacement}) {
    const mousePosition = useContext(MousePositionContext);
    const [savedMousePosition, setSavedMousePosition] = useState(mousePosition);
    const {columnGap, columnWidth, rowGap, rowHeight} = funnyConstants;
    const isMounted = useRef(false);
    const {x, y, w, h} = initialGhostPlacement;

    useEffect (
        () => {
            if (!isMounted.current) {
                setSavedMousePosition(mousePosition);
                isMounted.current = true;
            }
        },
        [setSavedMousePosition, isMounted, mousePosition]
    )

    useEffect(
        () => {
            const release = (e) => {
                const dx = Math.round((e.pageX - savedMousePosition[0]) / (columnGap + columnWidth));
                const dy = Math.round((e.pageY - savedMousePosition[1]) / (rowGap + rowHeight));
                releaseCallback({dx, dy});
            }
            window.addEventListener("mouseup", release, {once: true});
            window.addEventListener("touchend", release, {once: true});
            return () => {
                window.removeEventListener("mouseup", release);
                window.removeEventListener("touchend", release);
            }
        },
        [releaseCallback, savedMousePosition, columnGap, columnWidth, rowGap, rowHeight]
    );

    const leftOffset = mousePosition[0] - savedMousePosition[0];
    const dx = Math.round(leftOffset / (columnGap + columnWidth));
    const topOffset = mousePosition[1] - savedMousePosition[1];
    const dy = Math.round(topOffset / (rowGap + rowHeight));
    const snappedPlacement = placementStringFromXYWH({x: x + dx, y: y + dy, w, h});

    const snappedGhost = createElement("div", {
        style: {
            background: "green",
            opacity: "0.5",
            zIndex: "11",
            position: "relative",
            gridArea: snappedPlacement,
        }
    });

    return <>{snappedGhost}</>;
}

function ResizingController({direction, releaseCallback, initialGhostPlacement}) {
    const mousePosition = useContext(MousePositionContext);
    const [savedMousePosition, setSavedMousePosition] = useState(mousePosition);
    const {columnGap, columnWidth, rowGap, rowHeight} = funnyConstants;
    const isMounted = useRef(false);
    const {x, y, w, h} = initialGhostPlacement;

    useEffect (
        () => {
            if (!isMounted.current) {
                setSavedMousePosition(mousePosition);
                isMounted.current = true;
            }
        },
        [setSavedMousePosition, isMounted, mousePosition]
    )

    useEffect(
        () => {
            const release = (e) => {
                const mouse_dx = Math.round((e.pageX - savedMousePosition[0]) / (columnGap + columnWidth));
                const mouse_dy = Math.round((e.pageY - savedMousePosition[1]) / (rowGap + rowHeight));
                const diff = {dx: 0, dy: 0, dh: 0, dw: 0};
                if (direction.includes('u')) {
                    diff.dy = mouse_dy;
                    diff.dh = -mouse_dy;
                }
                else if (direction.includes('d')) {
                    diff.dh = mouse_dy;
                }
                if (direction.includes('l')) {
                    diff.dx = mouse_dx;
                    diff.dw = -mouse_dx;
                }
                else if (direction.includes('r')) {
                    diff.dw = mouse_dx;
                }
                releaseCallback({...diff});
            };
            window.addEventListener("mouseup", release, {once: true});
            window.addEventListener("touchend", release, {once: true});
            return () => {
                window.removeEventListener("mouseup", release);
                window.removeEventListener("touchend", release);
            }
        },
        [releaseCallback, direction, savedMousePosition, columnGap, columnWidth, rowGap, rowHeight]
    );

    const leftOffset = mousePosition[0] - savedMousePosition[0];
    const topOffset = mousePosition[1] - savedMousePosition[1];
    const dx = Math.round(leftOffset / (columnGap + columnWidth));
    const dy = Math.round(topOffset / (rowGap + rowHeight));
    const snappedPlacementObject = {x, y, w, h};

    if (direction.includes('u')) {
        snappedPlacementObject.y += dy;
        snappedPlacementObject.h -= dy;
    }
    else if (direction.includes('d')) {
        snappedPlacementObject.h += dy;
    }
    if (direction.includes('l')) {
        snappedPlacementObject.x += dx;
        snappedPlacementObject.w -= dx;
    }
    else if (direction.includes('r')) {
        snappedPlacementObject.w += dx;
    }
    if (snappedPlacementObject.x < 1) {
        snappedPlacementObject.x = x;
        snappedPlacementObject.w = w;
    }
    if (snappedPlacementObject.y < 1) {
        snappedPlacementObject.y = y;
        snappedPlacementObject.h = h;
    }
    const snappedPlacement = placementStringFromXYWH(snappedPlacementObject);

    const snappedGhost = createElement("div", {
        style: {
            background: "green",
            opacity: "0.5",
            zIndex: "11",
            position: "relative",
            gridArea: snappedPlacement,
        }
    });

    return <>{snappedGhost}</>;
}