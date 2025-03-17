const ELEVATOR_STATUS_IDLE = "ELEVATOR_IDLE";
const ELEVATOR_STATUS_MOVING = "ELEVATOR_MOVING";
const ELEVATOR_STATUS_ARRIVED = "ELEVATOR_ARRIVED";
const ELEVATOR_DIRECTION_UP = "ELEVATOR_DIRECTION_UP";
const ELEVATOR_DIRECTION_DOWN = "ELEVATOR_DIRECTION_DOWN";
const BTN_STATUS_BUSY = 'BTN_STATUS_BUSY';
const BTN_STATUS_FREE = 'BTN_STATUS_FREE';
const BTN_STATUS_ARRIVED = 'BTN_STATUS_ARRIVED';
const FLOOR_HEIGHT = 70; // height of each cell in pixels
const ELEVATOR_HEIGHT = 25; // height of elevator/car in pixels
const UNIT_TRAVEL_SECONDS = 5; // travel time from one floor to next floor in seconds
const MAX_FLOOR = 9;
function App(){
    this.intervalHandler = null;
    this.callRequests = [];
    this.elevatorElements = [];
    this.elevators = [];
    this.toneElement = null;
    this.initialize = ()=> {
        this.toneElement = document.getElementById('tone');
        this.elevatorElements = $('.elevator');
        if(this.elevatorElements.length > 0 ){
            this.elevators = this.elevatorElements.map((idx, ele) => {
                const elevator = new Elevator(ele);
                $(ele).data('elevator', elevator);
                return elevator;

            });
        }

        $(document).on( 'click','.action', (event, ele)=> {
            const btn = $(event.currentTarget);
            const caller = btn.data('floor');
            this.updateButtonStatus(btn, BTN_STATUS_BUSY);
            this.enqueueRequest(caller, btn);

        });
        $(document).on('click', '.elevator', (event, index)=> {
            $(event.currentTarget).data('elevator').debug()
        })
        this.startWorker();

    }
    this.startWorker = ()=> {
        this.intervalHandler = setInterval(()=> {
            if(this.callRequests.length > 0){
                this.processRequest();
            }
        }, 500);
    }

    this.updateButtonStatus = (btn, elevatorStatus) => {
        switch (elevatorStatus) {
            case BTN_STATUS_BUSY:
                btn.removeClass('green');
                btn.addClass('red');
                btn.text("Waiting");
                btn.prop('disabled', true);
                break;
            case BTN_STATUS_ARRIVED:
                btn.removeClass('red');
                btn.addClass('arrived');
                btn.text("Arrived");
                break;
            case BTN_STATUS_FREE:
                btn.removeClass('arrived');
                btn.addClass('green');
                btn.text("Call");
                btn.prop('disabled', false);
                break;
            default:
                console.warn("Unknown button status")

        }

    }
    /**
     * Find the closest available/idle car. Returns -1 if none are available
     * @param callerFloor
     * @returns {number | -1}
     */
    this.findNearestElevator = (callerFloor) => {
        let elevatorDistance = null;
        let elevatorIndex = -1; // negative index means no available cars found
        for(let i = 0; i < this.elevators.length; i++){
            if(this.elevators[i].status !== ELEVATOR_STATUS_IDLE) continue;

            // store distance between caller and current elevator element in temporary var for comparison
            const tempDistance = Math.abs(this.elevators[i].currentFloor - callerFloor);
            if(elevatorDistance === null){
                // We assume the first free car to be the target
                elevatorDistance = tempDistance; // assign first free car
                elevatorIndex = i;
            }else if(tempDistance <= elevatorDistance){
                //new temporary distance is less so we replace the value here and continue comparing all available cars
                elevatorDistance = tempDistance;
                elevatorIndex = i;
            }
           // console.log('tempDistance | elevatorDistance', tempDistance, elevatorDistance)
            //debugger;
        }

        return elevatorIndex;
    }

    this.enqueueRequest = (caller, btn)=> {
        this.callRequests.push({destination: caller, button: btn});
    }

    this.dequeueRequest = () => {
        return this.callRequests.shift();
    }
    this.peekRequest = ()=> {
        if(this.callRequests.length){
            return this.callRequests[0];
        }
        return null;
    }
    this.hasRequests = ()=> {
        return this.callRequests.length > 0;
    }

    this.processRequest = ()=> {
        if(!this.hasRequests()) return;
        const { destination} = this.peekRequest();

        const idx = this.findNearestElevator(destination)
        if(idx === -1) {
            console.warn("Elevator not free")
            return;
        }else{
            //console.info("Elevator found free: ", idx + 1)
        }
        const { destination: caller, button: btn} = this.dequeueRequest();


        const distance = Math.abs(caller - this.elevators[idx].currentFloor);
        //console.log('nearestElevator: ', this.elevators[idx].dom_element, distance);
        let speed = UNIT_TRAVEL_SECONDS *  1000 * distance;
        let bottom = caller  * FLOOR_HEIGHT +10; // hardcoded 10px is the initial bottom of the elevator image

        // setup timer
        const row = $(document).find('.hallway').eq((caller+1) * -1);
        const col = row.find('.lift').eq(idx + 1);
        let interval;
        if(col){
            const timer = col.find('.timer');
            timer.show();
            let seconds = 1;
            interval = setInterval(()=> {

                const minutes = Math.floor(seconds / 60);
                const s = seconds - minutes * 60;
                seconds++;
                timer.text(`${minutes} minute ${s} seconds`);
            }, 1000)
        }
        this.elevators[idx].move(caller);
        $(this.elevatorElements[idx]).animate({bottom: bottom}, speed, ()=> {
            this.elevators[idx].stop(caller);
            this.updateButtonStatus(btn, BTN_STATUS_ARRIVED);
            this.toneElement.play();
            if(col){
                col.find('.timer').hide();
                clearInterval(interval);
            }
            setTimeout(()=> {
                this.updateButtonStatus(btn, BTN_STATUS_FREE);

                $(this.elevatorElements[idx]).removeClass('arrived');
                $(this.elevatorElements[idx]).addClass('idle');
                this.toneElement.pause();
                this.toneElement.load();
                this.elevators[idx].setStatus(ELEVATOR_STATUS_IDLE);

            }, 2000)
        });
    }
}

function Elevator( element){
    this.direction = ELEVATOR_DIRECTION_UP;
    this.status = $(element).data('current-status') || ELEVATOR_STATUS_IDLE;
    this.currentFloor = $(element).data('current-floor') || 0;

    this.dom_element = element;

    this.setCurrentFloor = (currentFloor)=> {
        this.currentFloor = currentFloor;
    }

    this.setDirection = (direction) => {
        this.direction = direction;
    }

    this.setStatus = (status) => {
        this.status = status;
    }

    this.move = (destinationFloor) => {
        this.status = ELEVATOR_STATUS_MOVING;
        $(this.dom_element).data('current-status', this.status);
        if(destinationFloor >= this.currentFloor){
            this.direction = ELEVATOR_DIRECTION_UP;
        }else{
            this.direction = ELEVATOR_DIRECTION_DOWN;
        }
        $(this.dom_element).removeClass('idle');
        $(this.dom_element).removeClass('arrived');
        $(this.dom_element).addClass('busy');

    }

    this.stop = (stoppageFloor) => {
        this.status = ELEVATOR_STATUS_ARRIVED;
        this.currentFloor = stoppageFloor;
        $(this.dom_element).data('current-status', this.status);
        $(this.dom_element).data('current-floor', this.currentFloor);
        $(this.dom_element).removeClass('busy');
        $(this.dom_element).addClass('arrived');
    }

    this.debug = () => {
        const info = `Status: ${this.status}, Floor: ${this.currentFloor}, Direction: ${this.direction}`;
        console.log(info);
    }
}
