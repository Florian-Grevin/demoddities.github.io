function isFirefox() {
  return navigator.userAgent.toLowerCase().includes('firefox');
}

$(document).ready(function () {
	if (!isFirefox()){
		$(".confusedLook").attr('filter', 'url(#confused-eye-shadow)');
	}
	
	let eyeMode = "default";
	let lastMouseMoveTime = Date.now();
	const idleDelay = 2000;
	const sleepDelay = 5000;
	let hasInteracted = false;

	let previousAngle = null;
	let totalRotation = 0;
	let rotations = 0;
	let confusedLook = false;
	let hasMouseMoved = false;

	const stateColor = {
		"cross": [$('html').css('--color-cross')],
		"hover-left": [$('html').css('--color-hover-left')],
		"hover-right": [$('html').css('--color-hover-right')],
		"default": [$('html').css('--color-default')],
		"sleep": [$('html').css('--color-sleep')],
		"idle": [$('html').css('--color-idle')],
		"confused": [$('html').css('--color-confused')]
	};

	const lt = "left", rt = "right", hbox = "hitbox";

	const hitL = $("." + hbox + "." + lt),
		  hitR = $("." + hbox + "." + rt),
		  eyeL = $(".eye." + lt),
		  eyeR = $(".eye." + rt),
		  logo = $("#logo"),
		  sleepeye = $(".sleep.state"),
		  $state = $("#currentState");

	
	function updateStateDisplay(state = "default") {
		if ($state.text() === state) return;

		$state.text(state);
		const [color] = stateColor[state];

		$state.css("color", color);

		const isSleep = state === "sleep";

		$(".sleepLook").css("display", isSleep ? "block" : "none");
		sleepeye.toggleClass("hide", !isSleep);
		$("#fx").toggleClass("hide", !isSleep);

		const visualClasses = "sleep idle";
		eyeL.removeClass(visualClasses).addClass(state);
		eyeR.removeClass(visualClasses).addClass(state);
	}
	updateStateDisplay();
	
	// Vérifie si on est à l'intérieur du remplissage d'un élément SVG
	function isSVGPointInFill(svgElement, x, y) {
		if (!(svgElement instanceof SVGGeometryElement) || !svgElement.isPointInFill) return false;

		const svgRoot = svgElement.ownerSVGElement;
		if (!svgRoot || !svgRoot.createSVGPoint) return false;

		const point = svgRoot.createSVGPoint();
		point.x = x;
		point.y = y;

		const screenCTM = svgElement.getScreenCTM();
		if (!screenCTM) return false;

		const localPoint = point.matrixTransform(screenCTM.inverse());
		return svgElement.isPointInFill(localPoint);
	}

	// Vérifie si un des enfants d'un groupe SVG contient le point donné
	function isAnyChildInFill(groupSelector, x, y) {
		const group = document.querySelector(groupSelector);
		if (!group) return false;

		for (const child of group.children) {
			if (isSVGPointInFill(child, x, y)) {
				return true;
			}
		}
		return false;
	}

	// Détermine la zone d'interaction du curseur
	function getCursorInteractionZone(x, y) {
		if (isAnyChildInFill(".crossEyed", x, y)) return "cross";
		if (isSVGPointInFill(hitL[0], x, y)) return "hover-left";
		if (isSVGPointInFill(hitR[0], x, y)) return "hover-right";
		return "default";
	}
		
	function normalizeAngle(angle) {
		return (angle + 2 * Math.PI) % (2 * Math.PI);
	}

	function resetInactivityTimer() {
		if (!hasInteracted) hasInteracted = true;

		lastMouseMoveTime = Date.now();

		if (eyeMode === "sleep") {
			eyeMode = "default";
			updateStateDisplay(eyeMode);
		} 
	}

	setInterval(() => {
		if (confusedLook) return;
		
		const now = Date.now();
		if (hasInteracted && !confusedLook) {
			const inactivity = Date.now() - lastMouseMoveTime;

			if (inactivity > idleDelay + sleepDelay && eyeMode !== "sleep") {
				eyeMode = "sleep";
				sleepeye.css("fill","inherit");
			} else if (inactivity > idleDelay && eyeMode !== "idle" && eyeMode !== "sleep") {
				eyeMode = "idle";
				eyeL.css({ "--offset-x": "0px", "--offset-y": "0px" });
				eyeR.css({ "--offset-x": "0px", "--offset-y": "0px" });
			}
			updateStateDisplay(eyeMode);
		}
	}, 250);
	
	function setEyeOffset(side, x, y) {
		$(`.eye.${side}`).css({ "--offset-x": `${x}px`, "--offset-y": `${y}px` });
	}

	function applyCrossEyedEffect(cursorX, cursorY, leftBox, rightBox) {
		const cxL = leftBox.left + leftBox.width / 2;
		const cxR = rightBox.left + rightBox.width / 2;
		const yCenter = (leftBox.top + leftBox.bottom) / 2;
		const yRange = (leftBox.bottom - leftBox.top) / 2;

		const verticalFactor = Math.max(-1, Math.min(1, (cursorY - yCenter) / yRange));
		const midAngle = Math.atan2(cursorY - yCenter, cursorX - (cxL + cxR) / 2);

		const ox = Math.cos(midAngle) * 10;
		const oy = verticalFactor * 6;

		const insideHoriz = cursorX > cxL && cursorX < cxR;
		const insideVert = cursorY > leftBox.top && cursorY < leftBox.bottom;

		if (insideHoriz && insideVert) { // Louchement
			setEyeOffset("left", ox * 0.5, oy);
			setEyeOffset("right", -ox * 0.5, oy);
		} else { // Déplacement synchronisé
			setEyeOffset("left", ox, oy);
			setEyeOffset("right", ox, oy);
		}
	}

	function eyeFollow(event) {
		if (confusedLook || !event) return;

		// Ignorer mouvements nuls
		if (!hasMouseMoved && "movementX" in event && "movementY" in event &&
			event.movementX === 0 && event.movementY === 0) return;

		hasMouseMoved = true;
		resetInactivityTimer();

		const cursorX = event.clientX;
		const cursorY = event.clientY;

		// Détection SVG précise via géométrie
		eyeMode = getCursorInteractionZone(cursorX, cursorY);

		// Coordonnées et géométrie des yeux
		const leftBox = hitL[0].getBoundingClientRect();
		const rightBox = hitR[0].getBoundingClientRect();
		const bbox = logo[0].getBoundingClientRect();
		const centerX = bbox.left + bbox.width / 2;
		const centerY = bbox.top + bbox.height / 2;
		const distX = cursorX - centerX;
		const distY = cursorY - centerY;

		// Angle et position de base
		const baseAngle = Math.atan2(distY, distX);
		const baseX = Math.cos(baseAngle) * 10;
		const baseY = Math.sin(baseAngle) * 10;

		// Rotation confuse
		const normalizedAngle = normalizeAngle(baseAngle);
		if (previousAngle !== null) {
			let delta = normalizedAngle - previousAngle;
			if (delta < -Math.PI) delta += 2 * Math.PI;
			if (delta > Math.PI) delta -= 2 * Math.PI;

			const currentDirection = delta > 0 ? "clockwise" : "counterclockwise";
			if (typeof rotationDirection === "undefined") {
				rotationDirection = currentDirection;
			} else if (rotationDirection !== currentDirection) {
				rotations = 0;
				totalRotation = 0;
				rotationDirection = currentDirection;
			}

			totalRotation += delta;
			if (Math.abs(totalRotation) >= 2 * Math.PI) {
				rotations++;
				totalRotation = 0;

				if (rotations >= 3 && !confusedLook) {
					confusedLook = true;
					eyeMode = "confused";
					updateStateDisplay(eyeMode);
					$(".rotate.confused").removeClass("hide");
					$(".confusedLook").css("display", "block");
					eyeL.add(eyeR).css({ "--offset-x": "0px", "--offset-y": "0px" }).addClass("hide");

					document.documentElement.style.setProperty('--clockwiseangle',
						rotationDirection === "clockwise" ? "360deg" : "-360deg");

					setTimeout(() => {
						confusedLook = false;
						eyeMode = "default";
						updateStateDisplay(eyeMode);
						$(".rotate.confused").addClass("hide");
						$(".confusedLook").css("display", "none");
						eyeL.add(eyeR).removeClass("hide");
					}, 3000);
					rotations = 0;
				}
			}
		}
		previousAngle = normalizedAngle;

		// Appliquer comportement selon le mode
		switch (eyeMode) {
			case "cross":
				applyCrossEyedEffect(cursorX, cursorY, leftBox, rightBox);
				break;

			case "hover-left":
			case "hover-right":
				const side = eyeMode === "hover-left" ? lt : rt;
				const other = side === lt ? rt : lt;
				const box = side === lt ? leftBox : rightBox;

				const relX = cursorX - box.left - box.width / 2;
				const relY = cursorY - box.top - box.height / 2;
				const offX = (relX / box.width) * 10;
				const offY = (relY / box.height) * 10;

				$(`.eye.${side}`).css({ "--offset-x": `${offX}px`, "--offset-y": `${offY}px` });

				const midX = (leftBox.left + rightBox.right) / 2;
				const midY = (leftBox.top + leftBox.bottom) / 2;
				const angle = Math.atan2(cursorY - midY, cursorX - midX);
				const radius = 10;
				$(`.eye.${other}`).css({
					"--offset-x": `${Math.cos(angle) * radius}px`,
					"--offset-y": `${Math.sin(angle) * radius}px`
				});
				break;

			default:
				eyeL.add(eyeR).css({ "--offset-x": `${baseX}px`, "--offset-y": `${baseY}px` });
		}

		updateStateDisplay(eyeMode);
	}

	$(document).on("mousemove", eyeFollow);
	
	document.addEventListener("touchmove", (event) => {
	const touch = event.touches[0];
	if (!touch) return;

	// Simuler un event souris pour eyeFollow
	eyeFollow({ clientX: touch.clientX, clientY: touch.clientY, movementX: 1, movementY: 1 });
	}, { passive: true });
});
