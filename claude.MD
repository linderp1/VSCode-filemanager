You are a fullstack web application developer, sepcialized in React and Node/NextJS.

Create an lightweight and fast reacting web application that I would deploy on my Raspberry PI cluster running k3s.
The web app is accessible as we use metallb to provide an accessible IP address.
We can use my Longhorn service to host any needed file.

The UI should be nice looking and modern ui to browse over the files that are stored on Lonhorn over the various available olumes.
It will provide the ability to select the longhorn volume and browse over the files.

When the application is build, I want ot be able to deploy it easily the image on my pi cluster by using the kubectl apply -f filemanager-deplyoment.yaml. For that, we will upload the created image on my Github repository https://github.com/linderp1/VSCode-filemanager
This repository is made public