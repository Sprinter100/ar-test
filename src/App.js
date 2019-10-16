/* eslint-disable */

import React from 'react';
import './App.css';

require('./js/MTLLoader');
require('./js/OBJLoader');

import {
  AbsoluteOrientationSensor,
  RelativeOrientationSensor
} from './sensor-polyfills/motion-sensors.js';

const constraints = {
  audio: false,
  video: {
    facingMode: "environment",
    width: { min: 320, ideal: 1280, max: 1920 },
    height: { min: 576, ideal: 720, max: 1080 },
  }
};

class App extends React.Component {
  constructor(props) {
    super(props);

    this.videoRef = React.createRef();
    this.canvasContainerRef = React.createRef();
    this.isRelative = false;
    this.container;
    this.sensor;
    this.camera;
    this.scene;
    this.renderer;
    this.model;
  }

  componentDidMount() {
    if (navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        // window.stream = stream; // make stream available to browser console
        // video.srcObject = stream;

        if (this.videoRef.current) {
          this.videoRef.current.srcObject = stream;
        }

        this.init3dScene();
      }).catch((error) => {
        console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
      });
    }
  }

  init3dScene() {
    this.initScene();

    if (navigator.permissions) {
        // https://w3c.github.io/orientation-sensor/#model
        Promise.all([navigator.permissions.query({ name: "accelerometer" }),
                     navigator.permissions.query({ name: "magnetometer" }),
                     navigator.permissions.query({ name: "gyroscope" })])
               .then(results => {
                    if (results.every(result => result.state === "granted")) {
                        this.initSensor();
                    } else {
                        console.log("Permission to use sensor was denied.");
                    }
               }).catch(err => {
                    console.log("Integration with Permissions API is not enabled, still try to start app.");
                    this.initSensor();
               });
    } else {
        console.log("No Permissions API, still try to start app.");
        this.initSensor();
    }

    this.renderScene();
  }

  initScene() {
      this.container = this.canvasContainerRef.current;

      this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 200);
      this.camera.position.z = 10;

      this.scene = new THREE.Scene();

      const ambientLight = new THREE.AmbientLight(0x404040, 6);
      this.scene.add(ambientLight);

      const manager = new THREE.LoadingManager();
      const mtlLoader = new THREE.MTLLoader(manager);
      mtlLoader.setTexturePath('/resources/');

      mtlLoader.load('./resources/phone.mtl', materials => {
          materials.preload();

          const objLoader = new THREE.OBJLoader(manager);
          objLoader.setMaterials(materials);
          objLoader.load('/resources/phone.obj', object => {
              this.model = object;
              this.scene.add(this.model);
          });
      });

      this.renderer = new THREE.WebGLRenderer({ alpha: true });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.container.appendChild(this.renderer.domElement);

      window.addEventListener('resize', () => {
          this.camera.aspect = window.innerWidth / window.innerHeight;
          this.camera.updateProjectionMatrix();
          this.renderer.setSize(window.innerWidth, window.innerHeight);
      }, false);

      document.addEventListener('fullscreenchange', () => {
          if (document.fullscreenElement != null) {
            window.screen.orientation.lock("natural")
          }
      });
  }

  initSensor() {
      const options = { frequency: 60, coordinateSystem: null };
      this.sensor = this.isRelative ? new RelativeOrientationSensor(options) : new AbsoluteOrientationSensor(options);
      this.sensor.onreading = () => this.model.quaternion.fromArray(this.sensor.quaternion).inverse();
      this.sensor.onerror = (event) => {
        if (event.error.name == 'NotReadableError') {
          console.log("Sensor is not available.");
        }
      }
      this.sensor.start();
  }

  renderScene = () => {
      requestAnimationFrame(this.renderScene);
      this.camera.lookAt(this.scene.position);
      this.renderer.render(this.scene, this.camera);
  }

  onButtonClick = () => {
    const canvas = this.renderer.domElement;
    console.log(canvas.getContext('webgl'));
    canvas.getContext('webgl').drawImage(this.videoRef.current, 0, 0, canvas.width, canvas.height)
    // new THREE.TextureLoader().load( "textures/water.jpg" );
    // this.scene.background = new THREE.Color( 0xff0000 );
  }

  render() {
    return (
      <div className="App">
        <video ref={this.videoRef} style={{ width: '100%', height: '100%' }} playsInline autoPlay></video>
        <button onClick={this.onButtonClick}>setBg</button>
        <div ref={this.canvasContainerRef} className="canvas-container" />
      </div>
    )
  }
}

export default App;
