export function createSpaceScene(canvas, THREE) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 260);
    camera.position.set(0, 0, 32);
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    function prepareTexture(texture, isColorTexture = false) {
      if (isColorTexture) texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.anisotropy = maxAnisotropy;
    }

    scene.add(new THREE.AmbientLight(0x617da3, 0.52));
    const sunlight = new THREE.DirectionalLight(0xffffff, 1.75);
    sunlight.position.set(-18, 13, 22);
    scene.add(sunlight);
    const sunDirection = sunlight.position.clone().normalize();

    const nebulaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uScroll: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uScroll;
        varying vec2 vUv;

        float hash21(vec2 point) {
          point = fract(point * vec2(123.34, 456.21));
          point += dot(point, point + 45.32);
          return fract(point.x * point.y);
        }

        float noise2d(vec2 point) {
          vec2 cell = floor(point);
          vec2 local = fract(point);
          local = local * local * (3.0 - 2.0 * local);
          float a = hash21(cell);
          float b = hash21(cell + vec2(1.0, 0.0));
          float c = hash21(cell + vec2(0.0, 1.0));
          float d = hash21(cell + vec2(1.0, 1.0));
          return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
        }

        float fbm(vec2 point) {
          float value = 0.0;
          float amplitude = 0.5;
          mat2 octaveRotation = mat2(0.8, -0.6, 0.6, 0.8);
          for (int octave = 0; octave < 5; octave++) {
            value += noise2d(point) * amplitude;
            point = octaveRotation * point * 2.02 + vec2(17.1, 9.2);
            amplitude *= 0.5;
          }
          return value;
        }

        void main() {
          vec2 uv = vUv;
          float time = uTime * 0.012 + uScroll * 0.3;
          vec2 base = uv * vec2(3.2, 2.5);
          vec2 warp = vec2(
            fbm(base + vec2(time, 2.7)),
            fbm(base + vec2(5.2, -time * 0.7))
          );
          vec2 flow = base + (warp - 0.5) * 1.7 + vec2(time, -time * 0.48);
          float broadCloud = fbm(flow * 1.35);
          float fineCloud = fbm(flow * 3.0 + warp * 1.8);
          float filamentNoise = fbm(flow * 5.1 - warp * 2.1);
          float filaments = smoothstep(0.58, 0.82, filamentNoise);

          vec2 distortedUv = uv + (warp - 0.5) * 0.13;
          vec2 armA = (distortedUv - vec2(0.2, 0.56)) * vec2(2.5, 1.55);
          vec2 armB = (distortedUv - vec2(0.53, 0.36)) * vec2(2.1, 1.85);
          vec2 armC = (distortedUv - vec2(0.82, 0.63)) * vec2(2.7, 1.45);
          float cloudRegion = max(
            exp(-dot(armA, armA) * 1.15),
            max(exp(-dot(armB, armB) * 1.3), exp(-dot(armC, armC) * 1.1))
          );

          float structure = broadCloud * 0.7 + fineCloud * 0.3 + filaments * 0.1;
          float density = smoothstep(0.43, 0.7, structure);
          density *= smoothstep(0.16, 0.58, cloudRegion);
          density *= 0.68 + fineCloud * 0.48;

          float warmGas = smoothstep(0.67, 0.88, fbm(flow * 1.7 + vec2(3.8, 8.1)));
          vec3 blueGas = vec3(0.025, 0.11, 0.48);
          vec3 cyanGas = vec3(0.025, 0.43, 0.58);
          vec3 warmGasColor = vec3(0.62, 0.19, 0.085);
          vec3 gasColor = mix(blueGas, cyanGas, smoothstep(0.35, 0.72, fineCloud));
          gasColor = mix(gasColor, warmGasColor, warmGas * 0.72);

          float softGlow = smoothstep(0.44, 0.76, broadCloud) * cloudRegion;
          vec3 color = gasColor * (density * 0.62 + softGlow * 0.08);
          float alpha = clamp(density * 0.42 + softGlow * 0.045, 0.0, 0.42);
          gl_FragColor = vec4(color, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    });
    const nebula = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 96),
      nebulaMaterial
    );
    nebula.position.set(0, 0, -100);
    camera.add(nebula);

    const earth = new THREE.Group();
    earth.visible = false;
    const earthMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 18,
      specular: new THREE.Color(0x355879)
    });
    let nightLightsTexture = null;
    earthMaterial.onBeforeCompile = shader => {
      shader.uniforms.uNightLights = { value: nightLightsTexture };
      shader.uniforms.uNightSunDirection = { value: sunDirection };
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          '#include <common>\nvarying vec3 vPlanetWorldNormal;\nvarying vec2 vPlanetUv;'
        )
        .replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nvPlanetWorldNormal = normalize(mat3(modelMatrix) * normal);\nvPlanetUv = uv;'
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          '#include <common>\nuniform sampler2D uNightLights;\nuniform vec3 uNightSunDirection;\nvarying vec3 vPlanetWorldNormal;\nvarying vec2 vPlanetUv;'
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          float sunFacing = dot(normalize(vPlanetWorldNormal), normalize(uNightSunDirection));
          float nightMask = 1.0 - smoothstep(-0.14, 0.12, sunFacing);
          vec3 cityLights = texture2D(uNightLights, vPlanetUv).rgb;
          totalEmissiveRadiance += cityLights * nightMask * 1.35;`
        );
      earthMaterial.userData.shader = shader;
    };
    const earthRadius = window.innerWidth < 640 ? 9.2 : 17;
    const earthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(earthRadius, 192, 192),
      earthMaterial
    );
    earth.add(earthMesh);
    const cloudInnerRadius = earthRadius * 1.002;
    const cloudOuterRadius = earthRadius * 1.018;
    const cloudMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uCloudMap: { value: null },
        uSunDirection: { value: sunDirection },
        uPlanetCenter: { value: new THREE.Vector3() },
        uWorldToCloud: { value: new THREE.Matrix3() },
        uInnerRadius: { value: cloudInnerRadius },
        uOuterRadius: { value: cloudOuterRadius },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D uCloudMap;
        uniform vec3 uSunDirection;
        uniform vec3 uPlanetCenter;
        uniform mat3 uWorldToCloud;
        uniform float uInnerRadius;
        uniform float uOuterRadius;
        uniform float uTime;
        varying vec3 vWorldPosition;

        float hash31(vec3 point) {
          point = fract(point * 0.1031);
          point += dot(point, point.yzx + 33.33);
          return fract((point.x + point.y) * point.z);
        }

        float noise3d(vec3 point) {
          vec3 cell = floor(point);
          vec3 local = fract(point);
          local = local * local * (3.0 - 2.0 * local);
          float c000 = hash31(cell);
          float c100 = hash31(cell + vec3(1.0, 0.0, 0.0));
          float c010 = hash31(cell + vec3(0.0, 1.0, 0.0));
          float c110 = hash31(cell + vec3(1.0, 1.0, 0.0));
          float c001 = hash31(cell + vec3(0.0, 0.0, 1.0));
          float c101 = hash31(cell + vec3(1.0, 0.0, 1.0));
          float c011 = hash31(cell + vec3(0.0, 1.0, 1.0));
          float c111 = hash31(cell + vec3(1.0, 1.0, 1.0));
          float lower = mix(mix(c000, c100, local.x), mix(c010, c110, local.x), local.y);
          float upper = mix(mix(c001, c101, local.x), mix(c011, c111, local.x), local.y);
          return mix(lower, upper, local.z);
        }

        bool intersectSphere(vec3 rayOrigin, vec3 rayDirection, float radius, out float nearDistance, out float farDistance) {
          vec3 offset = rayOrigin - uPlanetCenter;
          float projected = dot(offset, rayDirection);
          float discriminant = projected * projected - (dot(offset, offset) - radius * radius);
          if (discriminant < 0.0) {
            nearDistance = 0.0;
            farDistance = 0.0;
            return false;
          }
          float root = sqrt(discriminant);
          nearDistance = -projected - root;
          farDistance = -projected + root;
          return farDistance > 0.0;
        }

        vec2 cloudUv(vec3 direction) {
          float longitude = atan(direction.z, -direction.x) / 6.2831853;
          if (longitude < 0.0) longitude += 1.0;
          float latitude = 1.0 - acos(clamp(direction.y, -1.0, 1.0)) / 3.14159265;
          return vec2(longitude, latitude);
        }

        void main() {
          vec3 rayOrigin = cameraPosition;
          vec3 rayDirection = normalize(vWorldPosition - rayOrigin);
          float outerNear;
          float outerFar;
          if (!intersectSphere(rayOrigin, rayDirection, uOuterRadius, outerNear, outerFar)) discard;

          float rayStart = max(outerNear, 0.0);
          float rayEnd = outerFar;
          float innerNear;
          float innerFar;
          if (intersectSphere(rayOrigin, rayDirection, uInnerRadius, innerNear, innerFar)) {
            float planetHit = innerNear > rayStart ? innerNear : innerFar;
            if (planetHit > rayStart) rayEnd = min(rayEnd, planetHit);
          }

          float rayLength = rayEnd - rayStart;
          if (rayLength <= 0.001) discard;

          const int sampleCount = 24;
          float stepLength = rayLength / float(sampleCount);
          float transmittance = 1.0;
          vec3 accumulatedLight = vec3(0.0);
          vec3 sunDirection = normalize(uSunDirection);
          vec3 localSunDirection = normalize(uWorldToCloud * sunDirection);

          for (int sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) {
            float distanceAlongRay = rayStart + (float(sampleIndex) + 0.5) * stepLength;
            vec3 samplePosition = rayOrigin + rayDirection * distanceAlongRay;
            vec3 radialDirection = normalize(samplePosition - uPlanetCenter);
            float altitude = (length(samplePosition - uPlanetCenter) - uInnerRadius) / (uOuterRadius - uInnerRadius);
            float shellProfile = smoothstep(0.0, 0.12, altitude) * (1.0 - smoothstep(0.7, 1.0, altitude));
            vec3 localDirection = normalize(uWorldToCloud * radialDirection);
            float cloudCoverage = texture2D(uCloudMap, cloudUv(localDirection)).a;
            float volumeDetail = noise3d(localDirection * 28.0 + vec3(uTime * 0.012, 3.7, 8.1));
            float fineDetail = noise3d(localDirection * 61.0 + vec3(4.2, -uTime * 0.008, 1.6));
            float cloudShape = smoothstep(0.035, 0.24, cloudCoverage + (volumeDetail - 0.5) * 0.12 + (fineDetail - 0.5) * 0.04);
            float density = cloudShape * shellProfile * mix(0.22, 1.42, volumeDetail) * mix(0.82, 1.16, fineDetail);
            float daylight = smoothstep(-0.18, 0.16, dot(radialDirection, sunDirection));
            float cloudHeight = smoothstep(0.06, 0.78, altitude);
            vec3 sunProbeDirection = normalize(localDirection + localSunDirection * 0.032);
            float sunProbeCoverage = texture2D(uCloudMap, cloudUv(sunProbeDirection)).a;
            float selfShadow = 1.0 - smoothstep(0.1, 0.38, sunProbeCoverage) * daylight * 0.42;
            float extinction = density * stepLength * 2.1;
            float sampleOpacity = 1.0 - exp(-extinction);
            vec3 cloudLight = mix(vec3(0.1, 0.15, 0.25), vec3(0.78, 0.88, 1.0), daylight * (0.72 + cloudHeight * 0.28));
            cloudLight *= selfShadow;
            cloudLight += vec3(0.24, 0.32, 0.46) * pow(max(dot(rayDirection, sunDirection), 0.0), 8.0) * daylight * (1.0 - selfShadow);
            accumulatedLight += transmittance * sampleOpacity * cloudLight;
            transmittance *= 1.0 - sampleOpacity;

            if (transmittance < 0.025) break;
          }

          float cloudOpacity = 1.0 - transmittance;
          if (cloudOpacity < 0.004) discard;
          gl_FragColor = vec4(accumulatedLight / max(cloudOpacity, 0.001), cloudOpacity);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide
    });
    const earthClouds = new THREE.Mesh(
      new THREE.SphereGeometry(cloudOuterRadius, 128, 128),
      cloudMaterial
    );
    earthClouds.rotation.y = 0.12;
    earthClouds.visible = false;
    earth.add(earthClouds);
    scene.add(earth);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(earthRadius * 1.035, 128, 128),
      new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vViewDirection;
          void main() {
            vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
            vNormal = normalize(normalMatrix * normal);
            vViewDirection = normalize(-viewPosition.xyz);
            gl_Position = projectionMatrix * viewPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          varying vec3 vViewDirection;
          void main() {
            float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDirection))), 3.2);
            gl_FragColor = vec4(0.16, 0.52, 1.0, rim * 0.52);
          }
        `,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false
      })
    );
    earth.add(atmosphere);

    const moon = new THREE.Group();
    moon.visible = false;
    const moonRadius = window.innerWidth < 640 ? 3.4 : 4.5;
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(moonRadius, 128, 128),
      new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 2, specular: new THREE.Color(0x242b35) })
    );
    moon.add(moonMesh);
    scene.add(moon);

    const moonGlow = new THREE.Mesh(
      new THREE.SphereGeometry(moonRadius * 1.04, 64, 64),
      new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vViewDirection;
          void main() {
            vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
            vNormal = normalize(normalMatrix * normal);
            vViewDirection = normalize(-viewPosition.xyz);
            gl_Position = projectionMatrix * viewPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          varying vec3 vViewDirection;
          void main() {
            float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDirection))), 3.0);
            gl_FragColor = vec4(0.22, 0.55, 1.0, rim * 0.28);
          }
        `,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false
      })
    );
    moon.add(moonGlow);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');
    function loadPlanetTexture(primaryUrl, fallbackUrl, onLoad, onError) {
      textureLoader.load(primaryUrl, onLoad, undefined, () => {
        if (fallbackUrl) textureLoader.load(fallbackUrl, onLoad, undefined, onError);
        else if (onError) onError();
      });
    }

    const supports8kTextures = renderer.capabilities.maxTextureSize >= 8192;
    const earthDayFallback = 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg';
    loadPlanetTexture(
      supports8kTextures ? 'assets/textures/earth-day-8k.jpg' : earthDayFallback,
      supports8kTextures ? earthDayFallback : null,
      texture => {
        prepareTexture(texture, true);
        earthMaterial.map = texture;
        earthMaterial.needsUpdate = true;
        earth.visible = true;
      },
      () => console.warn('No se pudo cargar la textura de la Tierra.')
    );
    textureLoader.load(
      'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg',
      texture => {
        prepareTexture(texture);
        earthMaterial.normalMap = texture;
        earthMaterial.normalScale.set(0.7, 0.7);
        earthMaterial.needsUpdate = true;
      }
    );
    textureLoader.load(
      'https://threejs.org/examples/textures/planets/earth_specular_2048.jpg',
      texture => {
        prepareTexture(texture);
        earthMaterial.specularMap = texture;
        earthMaterial.needsUpdate = true;
      }
    );
    const nightLightsFallback = 'https://threejs.org/examples/textures/planets/earth_lights_2048.png';
    loadPlanetTexture(
      supports8kTextures ? 'assets/textures/earth-night-8k.jpg' : nightLightsFallback,
      supports8kTextures ? nightLightsFallback : null,
      texture => {
        prepareTexture(texture, true);
        nightLightsTexture = texture;
        if (earthMaterial.userData.shader) {
          earthMaterial.userData.shader.uniforms.uNightLights.value = texture;
        }
      },
      undefined,
      () => console.warn('No se pudo cargar el mapa de luces nocturnas.')
    );
    textureLoader.load(
      'https://threejs.org/examples/textures/planets/earth_clouds_1024.png',
      texture => {
        prepareTexture(texture, true);
        cloudMaterial.uniforms.uCloudMap.value = texture;
        earthClouds.visible = true;
      },
      undefined,
      () => console.warn('No se pudo cargar la textura de nubes.')
    );
    const moonMaterial = moonMesh.material;
    textureLoader.load(
      'https://threejs.org/examples/textures/planets/moon_1024.jpg',
      texture => {
        prepareTexture(texture, true);
        moonMaterial.map = texture;
        moonMaterial.bumpMap = texture;
        moonMaterial.bumpScale = 0.12;
        moonMaterial.needsUpdate = true;
        moon.visible = true;
      },
      undefined,
      () => console.warn('No se pudo cargar la textura lunar.')
    );

    const starCount = 2600;
    const starPositions = new Float32Array(starCount * 3);
    const starPhases = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 150;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      starPositions[i * 3 + 2] = -Math.random() * 125 - 12;
      starPhases[i] = Math.random() * Math.PI * 2;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('aPhase', new THREE.BufferAttribute(starPhases, 1));
    const starMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute float aPhase;
        uniform float uTime;
        varying float vTwinkle;
        void main() {
          vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * viewPosition;
          gl_PointSize = clamp(1.8 * (32.0 / -viewPosition.z), 1.0, 3.0);
          vTwinkle = 0.55 + 0.45 * sin(uTime * 1.4 + aPhase);
        }
      `,
      fragmentShader: `
        varying float vTwinkle;
        void main() {
          float distanceFromCenter = length(gl_PointCoord - vec2(0.5));
          float glow = 1.0 - smoothstep(0.12, 0.5, distanceFromCenter);
          gl_FragColor = vec4(0.72, 0.84, 1.0, glow * vTwinkle);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    scene.add(new THREE.Points(starGeometry, starMaterial));

    let targetScroll = 0;
    let currentScroll = 0;
    let pointerX = 0;
    let pointerY = 0;
    function updateScrollTarget() {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      targetScroll = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    }

    function renderSpace(time) {
      const progress = currentScroll;
      const mobile = window.innerWidth < 640;
      const earthX = mobile ? 2 + progress : -10 + progress * 12;
      const earthY = mobile ? -16 + progress * 17 : -22 + progress * 20;
      earth.position.set(earthX, earthY, -8 - progress * 8);
      nebulaMaterial.uniforms.uTime.value = time;
      nebulaMaterial.uniforms.uScroll.value = progress;
      moon.position.set(
        mobile ? -2.5 : 8 - progress * 15,
        mobile ? 6 + progress * 8 : -1 + progress * 13,
        mobile ? -14 - progress * 8 : -11 - progress * 8
      );
      earth.rotation.y = time * 0.08 + progress * 2.4;
      earth.rotation.x = 0.06 + Math.sin(progress * Math.PI) * 0.16;
      earthClouds.rotation.y = 0.12 + time * 0.24 + progress * 0.12;
      moon.rotation.y = -time * 0.018;
      earth.updateMatrixWorld(true);
      earthClouds.updateMatrixWorld(true);
      earthClouds.getWorldPosition(cloudMaterial.uniforms.uPlanetCenter.value);
      const cloudWorldRotation = new THREE.Matrix4().extractRotation(earthClouds.matrixWorld);
      cloudMaterial.uniforms.uWorldToCloud.value.setFromMatrix4(cloudWorldRotation).invert();
      cloudMaterial.uniforms.uTime.value = time;
      camera.position.x += ((pointerX * 1.2 + progress * 1.4) - camera.position.x) * 0.035;
      camera.position.y += ((-pointerY * 0.8 + progress * 1.2) - camera.position.y) * 0.035;
      camera.position.z = 32 - progress * (mobile ? 7 : 12);
      camera.lookAt(camera.position.x * 0.35, camera.position.y * 0.35 - progress * 0.8, -2 - progress * 2.2);
      starMaterial.uniforms.uTime.value = time;
      renderer.render(scene, camera);
    }

    function animate(time) {
      currentScroll += (targetScroll - currentScroll) * 0.045;
      renderSpace(time * 0.001);
      requestAnimationFrame(animate);
    }

    window.addEventListener('scroll', updateScrollTarget, { passive: true });
    window.addEventListener('mousemove', event => {
      pointerX = event.clientX / window.innerWidth - 0.5;
      pointerY = event.clientY / window.innerHeight - 0.5;
    }, { passive: true });
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(window.devicePixelRatio || 1);
      renderer.setSize(window.innerWidth, window.innerHeight);
      updateScrollTarget();
    });
    updateScrollTarget();
    requestAnimationFrame(animate);

    // EJEMPLOS INTERACTIVOS: REACT HOOKS Y APIS REST
}
