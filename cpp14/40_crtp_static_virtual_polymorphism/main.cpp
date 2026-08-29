#include <iostream>

template <class Derived>
struct StaticBase {
    void run() const { static_cast<const Derived*>(this)->impl(); }
};

struct StaticWorker : StaticBase<StaticWorker> {
    void impl() const { std::cout << "static worker\n"; }
};

struct VirtualBase {
    virtual ~VirtualBase() = default;
    virtual void run() const = 0;
};

struct DynamicWorker : VirtualBase {
    void run() const override { std::cout << "dynamic worker\n"; }
};

int main() {
    StaticWorker static_worker;
    static_worker.run();

    DynamicWorker dynamic_worker;
    const VirtualBase& base = dynamic_worker;
    base.run();
}
