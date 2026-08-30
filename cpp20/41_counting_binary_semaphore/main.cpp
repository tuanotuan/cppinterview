// Day 41: Counting and Binary Semaphores
#include <iostream>
#include <semaphore>

int main() {
    std::counting_semaphore<2> slots{1};
    slots.acquire();
    std::cout << "counting permit acquired\n";
    slots.release();

    std::binary_semaphore signal{0};
    signal.release();
    signal.acquire();
    std::cout << "binary signal received\n";
}
