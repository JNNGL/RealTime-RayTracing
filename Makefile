run:
	clear
	g++ -c main.cpp -o engine.o
	g++ engine.o -o engine-app -lsfml-graphics -lsfml-window -lsfml-system -lsfml-network -lsfml-audio
	chmod 755 engine-app
	chown jnngl engine-app
	./engine-app
