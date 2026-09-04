// Daily C++ Interview Q019: What’s the output of the following sample program? Is that what
// you’d expect? Why? Why not?
// Key: The program prints `Dog speaks`, `Dog eats 42`, `Animal speaks`, then `Animal eats 42`.
// `speak` is not virtual, while `Dog::eat(unsigned)` does not override `Animal::eat(int)`;
// `override` would expose both mistakes at compile time.
#include <iostream>
#include <memory>

class Animal {
public:
    ~Animal() = default;

    virtual void eat(int quantity) {
        std::cout << "Animal eats " << quantity << '\n';
    }

    void speak() {
        std::cout << "Animal speaks\n";
    }
};

class Dog : public Animal {
public:
    void eat(unsigned int quantity) {
        std::cout << "Dog eats " << quantity << '\n';
    }

    void speak() {
        std::cout << "Dog speaks\n";
    }
};

int main() {
    Dog dog;
    dog.speak();
    dog.eat(42u);

    std::unique_ptr<Animal> animal = std::make_unique<Dog>();
    animal->speak();
    animal->eat(42u);
}
