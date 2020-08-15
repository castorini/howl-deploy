# Howl-JavaScript

In-browser keyword spotting for *hey firefox*

   * Machine learning : [Tensorflow.js](https://www.tensorflow.org/js)
   * Feature extraction : [Meyda](https://github.com/meyda/meyda) (the code has been customized)

## Instructions
* Make sure [howl-models](https://github.com/castorini/howl-models) submodule is initialized correctly (`git submodule update --init --recursive` from the parent directory)

* [Install docker](https://docs.docker.com/engine/install/) and [enable GPU support](https://cnvrg.io/how-to-setup-docker-and-nvidia-docker-2-0-on-ubuntu-18-04/)

* `docker build -t howl .`

## In-browser keyword spotting

To see the working demo, simply run

```
docker run -it -p 8000:8000 -v $(pwd):/app/src/ -v $(pwd)/../howl-models/howl-deploy/JavaScript:/app/src/howl-models howl
npm run dev
```

The server is running at `localhost:8000`

## Evaluating the performance of JS implementation

processed dataset for evaluation can be found from [howl](https://github.com/castorini/howl)

```
nvidia-docker run -it -p 8000:8000 -v <path_to_dataset>:/data -v $(pwd):/app/src/ -v $(pwd)/../howl-models/howl-deploy/JavaScript:/app/src/howl-models howl
npm run eval
```
